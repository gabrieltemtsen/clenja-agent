import { Router } from "express";
import { z } from "zod";
import { ethers } from "ethers";
import { routeIntent } from "../lib/intentRouter.js";
import { checkPolicy, getUserPolicy, recordPolicySpend } from "../lib/policy.js";
import { createChallenge, verifyChallenge } from "../lib/stateMachine.js";
import { makeWalletProvider } from "../adapters/provider.js";
import { TurnkeyWalletProvider } from "../adapters/turnkey.js";
import { LiveOfframpProvider } from "../adapters/offramp.js";
import { store } from "../lib/store.js";
import { checkRateLimit } from "../lib/rateLimit.js";
import { toUserFacingProviderError } from "../lib/providerErrors.js";
import { offrampConfig, turnkeyConfig } from "../lib/config.js";

export const chatRouter = Router();
const wallet = makeWalletProvider();
const offramp = new LiveOfframpProvider();

function fuzzyIncludes(a: string, b: string) {
  const aa = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  const bb = b.toLowerCase().replace(/[^a-z0-9]/g, "");
  return aa.includes(bb) || bb.includes(aa);
}

// Mobile money institution codes from Paycrest (verified live)
const MOBILE_MONEY_CODES: Record<string, string> = {
  // Kenya
  "mpesa": "SAFAKEPC", "m-pesa": "SAFAKEPC", "safaricom": "SAFAKEPC",
  "airtel kenya": "AIRTKEPC",
  // Ghana
  "mtn": "MOMOGHPC", "mtn mobile money": "MOMOGHPC", "mtn momo": "MOMOGHPC",
  "vodafone cash": "VODAGHPC", "vodafone": "VODAGHPC",
  "airteltigo": "AIRTGHPC", "airtel tigo": "AIRTGHPC", "tigo": "AIRTGHPC",
  // Uganda
  "mtn uganda": "MOMOUGPC", "mtn ug": "MOMOUGPC",
  "airtel uganda": "AIRTUGPC",
  // Tanzania
  "tigo pesa": "TIGOTZPC",
  "airtel tanzania": "AIRTTZPC",
  "halopesa": "HALOTZPC",
  // Malawi
  "tnm mpamba": "TNMPMWPC", "mpamba": "TNMPMWPC",
  // Brazil
  "pix": "PIXKBRPC",
};

// Country code → Paycrest currency code
const COUNTRY_TO_CURRENCY_CODE: Record<string, string> = {
  NG: "NGN", KE: "KES", GH: "GHS", UG: "UGX",
  TZ: "TZS", MW: "MWK", BR: "BRL", BJ: "XOF", CI: "XOF", IN: "INR",
};

async function resolveBankCode(bankName: string, country = "NG"): Promise<string> {
  const bankLower = bankName.toLowerCase().trim();

  // Check mobile money shortcuts first (exact or partial match)
  for (const [keyword, code] of Object.entries(MOBILE_MONEY_CODES)) {
    if (bankLower.includes(keyword) || keyword.includes(bankLower)) return code;
  }

  // Fetch real institution list from clova-pay (which proxies Paycrest live API)
  const currency = COUNTRY_TO_CURRENCY_CODE[country?.toUpperCase()] || "NGN";
  const banks: Array<{ name: string; code: string }> = (await offramp.listBanks?.(currency)) || [];
  const exact = banks.find((b) => b.name.toLowerCase() === bankLower);
  if (exact) return exact.code;
  const fuzzy = banks.find((b) => fuzzyIncludes(b.name, bankName));
  return fuzzy?.code || "";
}

function detectCountryFromInput(accountNumber: string, bankName: string): string {
  const bank = bankName.toLowerCase();
  if (/mpesa|m-pesa|safaricom/.test(bank)) return "KE";
  if (/mtn|vodafone|tigo|airtel/.test(bank) && accountNumber.startsWith("233")) return "GH";

  // Phone number prefix detection
  const prefixMap: Array<[string, string]> = [
    ["254", "KE"], ["233", "GH"], ["234", "NG"],
    ["256", "UG"], ["255", "TZ"], ["265", "MW"],
    ["55", "BR"], ["91", "IN"],
  ];
  for (const [prefix, country] of prefixMap) {
    if (accountNumber.startsWith(prefix)) return country;
  }

  return "NG"; // default
}

function formatAmount(value: string | number, maxDp = 4) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString(undefined, { maximumFractionDigits: maxDp });
}

function formatBalanceLine(token: string, amount: string) {
  const dp = token === "cUSD" ? 2 : 4;
  return `${formatAmount(amount, dp)} ${token}`;
}

function formatShortTime(ts?: number) {
  if (!ts) return "just now";
  const diffMs = Date.now() - ts;
  const mins = Math.max(1, Math.round(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return `${hours}h ago`;
}

function humanizeCashoutStatus(status: string) {
  const s = status.toLowerCase();
  if (s.includes("awaiting_deposit")) return "waiting for deposit confirmation";
  if (s.includes("confirm")) return "confirming onchain deposit";
  if (s.includes("paid_out")) return "bank transfer initiated";
  if (s.includes("settled")) return "credited to bank";
  if (s.includes("fail")) return "failed";
  return status;
}

function formatExpiry(expiresAt?: number): string {
  if (!expiresAt) return "";
  const diffMs = expiresAt - Date.now();
  if (diffMs <= 0) return " (expired)";
  const mins = Math.ceil(diffMs / 60000);
  return ` · Quote valid for ${mins} min`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  NG: "NGN", KE: "KES", GH: "GHS", UG: "UGX",
  TZ: "TZS", MW: "MWK", BR: "BRL", BJ: "XOF", CI: "XOF", IN: "INR",
};

function currencyForCountry(country: string): string {
  return COUNTRY_TO_CURRENCY[country?.toUpperCase()] ?? "NGN";
}

function parseCashoutBankDetails(input: string) {
  const t = input.trim();
  const acctMatch = t.match(/(?:account(?:\s*number)?\s*[:=]?\s*)?(\d{7,15})/i);
  if (!acctMatch) return null;

  const accountNumber = acctMatch[1];
  let bankName = "";
  let accountName = "";

  const bankLabel = t.match(/bank\s*[:=]\s*([^,;\n]+)/i);
  if (bankLabel) bankName = bankLabel[1].trim();

  const nameLabel = t.match(/account\s*name\s*[:=]\s*([^,;\n]+)/i);
  if (nameLabel) accountName = nameLabel[1].trim();

  if (!bankName) {
    const withoutAcct = t.replace(acctMatch[0], " ").replace(/\s+/g, " ").trim();
    bankName = withoutAcct
      .replace(/^to\s+/i, "")
      .replace(/^bank\s*/i, "")
      .replace(/^account\s*name\s*[:=]?.*$/i, "")
      .replace(/[,:;]+$/g, "")
      .trim();
  }

  if (!accountName) {
    accountName = "Cashout Recipient";
  }

  if (!bankName) return null;

  return { accountNumber, bankName, accountName };
}

const chatSchema = z.object({ userId: z.string(), text: z.string() });

chatRouter.post("/message", async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { userId, text } = parsed.data;
  const rl = checkRateLimit(`chat:${userId}`);
  if (!rl.ok) {
    res.setHeader("x-ratelimit-limit", "20");
    res.setHeader("x-ratelimit-remaining", "0");
    res.setHeader("retry-after", String(Math.ceil(rl.retryAfterMs / 1000)));
    return res.status(429).json({ reply: `Too many requests. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.` });
  }
  res.setHeader("x-ratelimit-limit", "20");
  res.setHeader("x-ratelimit-remaining", String(rl.remaining));

  const routed = await routeIntent(text);
  const intent = routed.intent;
  store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.message", status: "ok", detail: { text, intent: intent.kind, parser: routed.source } });

  if (intent.kind === "help") {
    return res.json({
      reply: "I can help with balance checks, sends, swaps, limits, and cashout. Try: 'swap 10 CELO to cUSD', 'send 5 cUSD to Gabriel', 'cashout 50 cUSD', or 'what's the status of my cashout?'"
    });
  }

  if (intent.kind === "greeting") {
    return res.json({ reply: "Hey 👋 Ready when you are. Want to check balance, swap, send, or cash out?" });
  }

  const pending = store.getPendingAction(userId);

  if (intent.kind === "confirm_yes") {
    if (!pending) return res.json({ reply: "Nothing pending confirmation right now." });

    if (pending.kind === "update_recipient") {
      const { name, address } = pending.payload;
      store.upsertRecipient({ id: `rcp_${Date.now()}`, userId, name, address, createdAt: Date.now(), updatedAt: Date.now() });
      store.clearPendingAction(userId);
      return res.json({ reply: `✅ Updated '${name}' to ${address.slice(0, 6)}...${address.slice(-4)}.` });
    }

    if (pending.kind === "delete_recipient") {
      const { name } = pending.payload;
      const ok = store.deleteRecipient(userId, name);
      store.clearPendingAction(userId);
      return res.json({ reply: ok ? `🗑️ Deleted recipient '${name}'.` : `I couldn't find recipient '${name}'.` });
    }
  }

  // Handle cashout country callback (forwarded from Telegram inline button tap)
  if (text.startsWith("cashout_country:")) {
    const parts = text.split(":");
    const country = parts[1];
    const amount = parts[2];
    const token = parts[3];

    if (!country || !amount || !token) {
      return res.json({ reply: "Invalid country selection. Please try the cashout command again." });
    }

    const currency = currencyForCountry(country);
    try {
      const quote = await offramp.quote({
        userId,
        fromToken: token as "cUSD" | "CELO",
        amount,
        country: country as any,
        currency: currency as any,
      });

      store.setPendingAction(userId, "cashout_bank_details", {
        quoteId: quote.quoteId,
        amount,
        token,
        country,
      });

      const exampleByCountry: Record<string, string> = {
        NG: "0812345678 Access Bank",
        KE: "254712345678 MPESA",
        GH: "0244567890 MTN Mobile Money",
        UG: "256701234567 MTN Uganda",
        TZ: "255621234567 Vodacom Tanzania",
        IN: "9845612370 HDFC Bank",
        BR: "11987654321 Nubank",
        BJ: "22961234567 Moov Benin",
        CI: "22507890123 Wave",
        MW: "265881234567 Airtel Malawi",
      };
      const example = exampleByCountry[country] || "<account_number> <bank name>";

      return res.json({
        reply: `You'll receive about ${formatAmount(quote.receiveAmount, 2)} ${currency}${formatExpiry(quote.expiresAt)}\n\nNow send your bank details in one line:\n• Example: ${example}`,
        quote,
        action: "awaiting_bank_details",
      });
    } catch (e) {
      return res.status(502).json({ reply: toUserFacingProviderError(e, "offramp") });
    }
  }

  if (pending?.kind === "cashout_bank_details") {
    if (/^(cancel|stop|nevermind)$/i.test(text.trim())) {
      store.clearPendingAction(userId);
      return res.json({ reply: "Cashout request cancelled." });
    }

    const details = parseCashoutBankDetails(text);
    if (!details) {
      return res.json({ reply: "Please send bank details in one line.\nExamples:\n• Nigeria: 0812345678 Access Bank\n• Kenya: 254712345678 MPESA\n• Ghana: 0244567890 MTN Mobile Money" });
    }

    const detectedCountry = pending.payload.country || detectCountryFromInput(details.accountNumber, details.bankName);
    const bankCode = await resolveBankCode(details.bankName, detectedCountry);
    if (!bankCode) {
      return res.json({ reply: `I couldn't resolve bank code for '${details.bankName}'. Please send the exact bank name (e.g. Access Bank, UBA, Zenith Bank).` });
    }

    let verifiedName = details.accountName;
    const isMobileMoney = bankCode === "SAFAKEPC" || /mpesa|m-pesa|safaricom|mtn mobile|airtel money|wave|moov/i.test(details.bankName);
    if (!isMobileMoney) {
      try {
        const vr = await offramp.verifyRecipient?.({
          accountNumber: details.accountNumber,
          bankCode,
          accountName: details.accountName,
        });
        if (offrampConfig.mode === "live" && vr && !vr.verified) {
          return res.json({ reply: "I couldn't verify that bank account. Please double-check account number and bank name." });
        }
        verifiedName = vr?.accountName || details.accountName;
      } catch {
        // skip verification errors in mock mode; fail loudly in live
        if (offrampConfig.mode === "live") {
          return res.json({ reply: "Bank account verification failed. Please re-check details and try again." });
        }
      }
    }

    const otp = "123456";
    const ch = createChallenge({
      userId,
      type: "cashout_otp",
      expected: otp,
      context: {
        kind: "cashout",
        quoteId: pending.payload.quoteId,
        amount: pending.payload.amount,
        token: pending.payload.token,
        beneficiary: {
          country: detectedCountry,
          currency: currencyForCountry(detectedCountry),
          bankName: details.bankName,
          accountName: verifiedName,
          accountNumber: details.accountNumber,
          bankCode,
        },
      },
    });

    store.clearPendingAction(userId);
    return res.json({
      reply: `Got it ✅ (account verified)\n• Bank: ${details.bankName}\n• Account: ${details.accountNumber}\n• Name: ${verifiedName}\nReply with OTP 123456 to create and start the cashout.`,
      challengeId: ch.id,
      action: "awaiting_confirmation",
    });
  }

  if (intent.kind === "show_limits") {
    const p = getUserPolicy(userId);
    return res.json({ reply: `Limits:\n• Daily: $${p.dailyLimitUsd}\n• Per-tx: $${p.perTxLimitUsd}\n• Sending: ${p.paused ? "paused" : "active"}` });
  }

  if (intent.kind === "set_daily_limit") {
    const amount = Number(intent.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.json({ reply: "Please provide a valid daily limit amount." });
    const p = store.upsertUserPolicy(userId, { dailyLimitUsd: amount });
    return res.json({ reply: `✅ Daily limit set to $${p.dailyLimitUsd}.` });
  }

  if (intent.kind === "set_per_tx_limit") {
    const amount = Number(intent.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.json({ reply: "Please provide a valid per-tx limit amount." });
    const p = store.upsertUserPolicy(userId, { perTxLimitUsd: amount });
    return res.json({ reply: `✅ Per-tx limit set to $${p.perTxLimitUsd}.` });
  }

  if (intent.kind === "pause_sending") {
    store.upsertUserPolicy(userId, { paused: true });
    return res.json({ reply: "⏸️ Sending paused. Reply 'resume sending' when ready." });
  }

  if (intent.kind === "resume_sending") {
    store.upsertUserPolicy(userId, { paused: false });
    return res.json({ reply: "▶️ Sending resumed." });
  }

  if (intent.kind === "balance") {
    try {
      const b = await wallet.getBalance(userId);
      const line = b.balances.map((x) => formatBalanceLine(x.token, x.amount)).join(" • ");
      return res.json({ reply: `Your balance is ${line}. Want me to also check your latest cashout status?`, data: b });
    } catch (e) {
      return res.status(502).json({ reply: toUserFacingProviderError(e, "wallet") });
    }
  }

  if (intent.kind === "sendability_check") {
    try {
      const b = await wallet.getBalance(userId);
      const celo = Number(b.balances.find((x) => x.token === "CELO")?.amount || "0");
      const reply = celo > 0
        ? `Yes - you can send CELO. You currently have about ${celo} CELO. Say: send <amount> CELO to <0x...>.`
        : "Not yet - you currently have 0 CELO. Fund your wallet first, then I can send instantly.";
      return res.json({ reply, data: b });
    } catch (e) {
      return res.status(502).json({ reply: toUserFacingProviderError(e, "wallet") });
    }
  }

  if (intent.kind === "drain_agent") {
    if (!userId.startsWith("wallet:")) return res.json({ reply: "This command is only for connected wallets." });

    try {
      // Use Turnkey provider directly to inspect hidden agent wallet
      const tk = new TurnkeyWalletProvider();
      const b = await tk.getBalance(userId);
      const celo = b.balances.find(x => x.token === "CELO")?.amount || "0";
      const val = parseFloat(celo);

      if (val < 0.002) return res.json({ reply: `Agent wallet is effectively empty (${val} CELO).` });

      const amountToSend = (val - 0.002).toFixed(4); // Leave gas buffer
      const to = userId.split(":")[1];

      // Use main wallet provider to prepare send (delegates to Turnkey for quote)
      const q = await wallet.prepareSend({ fromUserId: userId, token: "CELO", amount: amountToSend, to });
      const last4 = to.slice(-4);

      // Create confirmation challenge
      const ch = createChallenge({ userId, type: "new_recipient_last4", expected: last4, context: { kind: "send", quoteId: q.quoteId, to, token: "CELO", amount: amountToSend } });

      return res.json({
        reply: `Found ${val.toFixed(4)} CELO in Agent Wallet.\nSweeping ${amountToSend} CELO to your connected wallet... Reply with ${last4} to confirm.`,
        challengeId: ch.id,
        action: "awaiting_confirmation"
      });

    } catch (e) {
      store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.drain_agent.error", status: "error", detail: { error: String(e) } });
      return res.json({ reply: "No active Agent Wallet found to drain." });
    }
  }

  if (intent.kind === "history") {
    const receipts = store.listReceipts(userId).slice(0, 5);
    if (!receipts.length) return res.json({ reply: "No transactions yet." });
    const lines = receipts.map((r) => {
      const link = r.ref.startsWith("0x") ? `https://celoscan.io/tx/${r.ref}` : r.ref;
      return `• ${r.kind}: ${formatAmount(r.amount, 4)} ${r.token} (${formatShortTime(r.createdAt)})\n  ${link}`;
    });
    return res.json({ reply: `Here are your recent transactions:\n${lines.join("\n")}`, receipts });
  }

  if (intent.kind === "save_recipient") {
    store.upsertRecipient({
      id: `rcp_${Date.now()}`,
      userId,
      name: intent.name,
      address: intent.address,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return res.json({ reply: `✅ Saved recipient '${intent.name}' (${intent.address.slice(0, 6)}...${intent.address.slice(-4)}).` });
  }

  if (intent.kind === "update_recipient") {
    const exists = store.listRecipients(userId).some((r) => r.name.toLowerCase() === intent.name.toLowerCase());
    if (!exists) return res.json({ reply: `I couldn't find recipient '${intent.name}'.` });
    store.setPendingAction(userId, "update_recipient", { name: intent.name, address: intent.address });
    return res.json({ reply: `About to update '${intent.name}' to ${intent.address.slice(0, 6)}...${intent.address.slice(-4)}. Reply YES to confirm.` });
  }

  if (intent.kind === "delete_recipient") {
    const exists = store.listRecipients(userId).some((r) => r.name.toLowerCase() === intent.name.toLowerCase());
    if (!exists) return res.json({ reply: `I couldn't find recipient '${intent.name}'.` });
    store.setPendingAction(userId, "delete_recipient", { name: intent.name });
    return res.json({ reply: `About to delete recipient '${intent.name}'. Reply YES to confirm.` });
  }

  if (intent.kind === "list_recipients") {
    const recipients = store.listRecipients(userId);
    if (!recipients.length) return res.json({ reply: "You have no saved recipients yet. Save one with: save recipient Gabriel 0x..." });
    const lines = recipients.slice(0, 10).map((r) => `• ${r.name}: ${r.address.slice(0, 6)}...${r.address.slice(-4)}`);
    return res.json({ reply: `Saved recipients:\n${lines.join("\n")}`, recipients });
  }

  if (intent.kind === "address") {
    try {
      const w = await wallet.createOrLinkUserWallet(userId);
      return res.json({ reply: `Here's your wallet address:\n${w.walletAddress}`, walletAddress: w.walletAddress });
    } catch (e) {
      return res.status(502).json({ reply: toUserFacingProviderError(e, "wallet") });
    }
  }

  if (intent.kind === "status") {
    const asksCashoutStatus = /(cash\s*out|cashout|payout|offramp|withdraw(?:al)?|order)/i.test(text);
    if (asksCashoutStatus) {
      const latestCashout = store.listReceipts(userId).filter((r) => r.kind === "cashout").slice(-1)[0];
      if (!latestCashout) {
        return res.json({ reply: "I couldn't find a recent cashout order. Ask: cashout status <orderId>." });
      }
      try {
        const s = await offramp.status(latestCashout.ref);
        return res.json({ reply: `Your latest cashout (${latestCashout.ref}) is ${humanizeCashoutStatus(s.status)}${s.updatedAt ? ` - updated ${formatShortTime(s.updatedAt)}` : ""}.`, data: s });
      } catch (e) {
        return res.status(502).json({ reply: toUserFacingProviderError(e, "offramp") });
      }
    }

    return res.json({ reply: "🟢 CLENJA API is online. Use /v1/readiness for full provider status." });
  }

  if (intent.kind === "cashout_status") {
    try {
      const s = await offramp.status(intent.orderId);
      return res.json({ reply: `Cashout ${intent.orderId} is ${humanizeCashoutStatus(s.status)}${s.updatedAt ? ` - updated ${formatShortTime(s.updatedAt)}` : ""}.`, data: s });
    } catch (e) {
      return res.status(502).json({ reply: toUserFacingProviderError(e, "offramp") });
    }
  }

  if (intent.kind === "swap") {
    if (intent.fromToken === intent.toToken) return res.json({ reply: "From and to token are the same. Try CELO -> cUSD or cUSD -> CELO." });

    const pc = checkPolicy({ userId, action: "swap", amount: Number(intent.amount), token: intent.fromToken as "CELO" | "cUSD" });
    if (!pc.ok) {
      store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.swap.blocked", status: "error", detail: { reason: pc.reason } });
      return res.json({ reply: `Blocked by policy: ${pc.reason}` });
    }

    try {
      const quote = await wallet.prepareSwap({ fromUserId: userId, fromToken: intent.fromToken as "CELO" | "cUSD", toToken: intent.toToken as "CELO" | "cUSD", amountIn: intent.amount, slippageBps: 100 });
      const expected = Number(quote.amountOut);
      const code = String(Math.round(expected * 10000)).slice(-4).padStart(4, "0");
      const ch = createChallenge({ userId, type: "new_recipient_last4", expected: code, context: { kind: "swap", quoteId: quote.quoteId, fromToken: intent.fromToken, toToken: intent.toToken, amountIn: intent.amount, minAmountOut: quote.minAmountOut } });
      return res.json({ reply: `I can swap ${formatAmount(intent.amount, 4)} ${intent.fromToken} to about ${formatAmount(quote.amountOut, 4)} ${intent.toToken} (min ${formatAmount(quote.minAmountOut, 4)}). Reply with code ${code} to confirm.`, challengeId: ch.id, action: "awaiting_confirmation" });
    } catch (e) {
      return res.status(502).json({ reply: toUserFacingProviderError(e, "wallet") });
    }
  }

  if (intent.kind === "send_to_recipient") {
    const recipients = store.listRecipients(userId).filter((r) => fuzzyIncludes(r.name, intent.recipientName));
    if (recipients.length === 0) {
      return res.json({ reply: `I couldn't find a saved recipient named '${intent.recipientName}'. Save it with: save recipient ${intent.recipientName} 0x...` });
    }
    if (recipients.length > 1) {
      return res.json({ reply: `I found multiple recipients for '${intent.recipientName}': ${recipients.map((r) => r.name).join(", ")}. Please be more specific.` });
    }

    const resolved = recipients[0];
    const pc = checkPolicy({ userId, action: "send", amount: Number(intent.amount), token: intent.token as "CELO" | "cUSD", recipient: resolved.address });
    if (!pc.ok) {
      store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.send.blocked", status: "error", detail: { reason: pc.reason } });
      return res.json({ reply: `Blocked by policy: ${pc.reason}` });
    }

    try {
      const q = await wallet.prepareSend({ fromUserId: userId, token: intent.token as "CELO" | "cUSD", amount: intent.amount, to: resolved.address });
      const last4 = resolved.address.slice(-4);
      const ch = createChallenge({ userId, type: "new_recipient_last4", expected: last4, context: { kind: "send", quoteId: q.quoteId, to: resolved.address, token: intent.token, amount: intent.amount } });
      return res.json({ reply: `You're about to send ${formatAmount(intent.amount, 4)} ${intent.token} to ${resolved.name}. Reply with ${last4} to confirm.`, challengeId: ch.id, action: "awaiting_confirmation" });
    } catch (e) {
      return res.status(502).json({ reply: toUserFacingProviderError(e, "wallet") });
    }
  }

  if (intent.kind === "send") {
    const pc = checkPolicy({ userId, action: "send", amount: Number(intent.amount), token: intent.token as "CELO" | "cUSD", recipient: intent.to });
    if (!pc.ok) {
      store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.send.blocked", status: "error", detail: { reason: pc.reason } });
      return res.json({ reply: `Blocked by policy: ${pc.reason}` });
    }

    try {
      const q = await wallet.prepareSend({ fromUserId: userId, token: intent.token as "CELO" | "cUSD", amount: intent.amount, to: intent.to });
      const last4 = intent.to.slice(-4);
      const ch = createChallenge({ userId, type: "new_recipient_last4", expected: last4, context: { kind: "send", quoteId: q.quoteId, to: intent.to, token: intent.token, amount: intent.amount } });
      return res.json({ reply: `You're about to send ${formatAmount(intent.amount, 4)} ${intent.token}. Reply with ${last4} to confirm the recipient.`, challengeId: ch.id, action: "awaiting_confirmation" });
    } catch (e) {
      return res.status(502).json({ reply: toUserFacingProviderError(e, "wallet") });
    }
  }

  if (intent.kind === "cashout") {
    if (intent.token === "CELO") {
      return res.json({ reply: "For cashout, CELO must be swapped to cUSD first. Try: swap <amount> CELO to cUSD, then cashout <amount> cUSD." });
    }

    // ── Balance check ── confirm user has enough before proceeding
    try {
      const balData = await wallet.getBalance(userId);
      const token = (intent.token || "cUSD").toUpperCase();
      const tokenKey = token === "CUSD" ? "cUSD" : token;
      const balEntry = balData.balances.find((b: any) =>
        b.token.toUpperCase() === tokenKey.toUpperCase()
      );
      const userBalance = Number(balEntry?.amount || "0");
      const cashoutAmount = Number(intent.amount);
      if (cashoutAmount > userBalance) {
        return res.json({
          reply: `⚠️ Insufficient balance.\n\nYou have *${userBalance.toFixed(4)} ${tokenKey}* but cashout amount is *${cashoutAmount} ${tokenKey}*.\n\nDeposit more ${tokenKey} or try a smaller amount.`,
        });
      }
    } catch (balErr: any) {
      console.warn("[cashout] balance check failed, proceeding:", balErr.message);
      // Don't block if balance check fails — Paycrest will reject if funds aren't there
    }

    const pc = checkPolicy({ userId, action: "cashout", amount: Number(intent.amount), token: intent.token as "CELO" | "cUSD" });
    if (!pc.ok) {
      store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.cashout.blocked", status: "error", detail: { reason: pc.reason } });
      return res.json({ reply: `❌ Blocked by policy: ${pc.reason}` });
    }

    let beneficiary: { country: string; bankName: string; accountName: string; accountNumber: string; bankCode?: string } | undefined;
    if (intent.beneficiaryName) {
      const matches = store.listBeneficiaries(userId).filter((b) => fuzzyIncludes(b.accountName, intent.beneficiaryName!));
      if (matches.length === 1) {
        const found = matches[0];
        beneficiary = { country: found.country, bankName: found.bankName, accountName: found.accountName, accountNumber: found.accountNumberMasked, bankCode: offrampConfig.defaultBeneficiary.bankCode };
      } else if (matches.length > 1) {
        return res.json({ reply: `I found multiple beneficiaries for '${intent.beneficiaryName}': ${matches.map((m) => m.accountName).join(", ")}. Please be more specific.` });
      } else {
        return res.json({ reply: `No beneficiary found for '${intent.beneficiaryName}'. Save one in /beneficiaries first.` });
      }
    }

    // No saved beneficiary: ask for destination country first with inline keyboard
    if (!beneficiary) {
      return res.json({
        reply: "💸 Where are you sending cash to?",
        action: "cashout_country_select",
        inlineKeyboard: [
          [
            { text: "🇳🇬 Nigeria (NGN)", callbackData: `cashout_country:NG:${intent.amount}:${intent.token}` },
            { text: "🇰🇪 Kenya (KES)", callbackData: `cashout_country:KE:${intent.amount}:${intent.token}` },
          ],
          [
            { text: "🇬🇭 Ghana (GHS)", callbackData: `cashout_country:GH:${intent.amount}:${intent.token}` },
            { text: "🇺🇬 Uganda (UGX)", callbackData: `cashout_country:UG:${intent.amount}:${intent.token}` },
          ],
          [
            { text: "🇹🇿 Tanzania (TZS)", callbackData: `cashout_country:TZ:${intent.amount}:${intent.token}` },
            { text: "🇲🇼 Malawi (MWK)", callbackData: `cashout_country:MW:${intent.amount}:${intent.token}` },
          ],
          [
            { text: "🇧🇷 Brazil (BRL)", callbackData: `cashout_country:BR:${intent.amount}:${intent.token}` },
          ],
        ],
      });
    }

    try {
      const cashoutCountry = beneficiary.country as any;
      const cashoutCurrency = currencyForCountry(cashoutCountry);
      const quote = await offramp.quote({ userId, fromToken: intent.token as "cUSD" | "CELO", amount: intent.amount, country: cashoutCountry, currency: cashoutCurrency as any });
      const otp = "123456";
      const ch = createChallenge({ userId, type: "cashout_otp", expected: otp, context: { kind: "cashout", quoteId: quote.quoteId, amount: intent.amount, token: intent.token, beneficiary } });
      return res.json({ reply: `Cashout quote is ready 💸 You'll receive about ${formatAmount(quote.receiveAmount, 2)} ${cashoutCurrency}${formatExpiry(quote.expiresAt)}. Reply with OTP 123456 to continue.`, quote, challengeId: ch.id, action: "awaiting_confirmation" });
    } catch (e) {
      return res.status(502).json({ reply: toUserFacingProviderError(e, "offramp") });
    }
  }

  return res.json({ reply: routed.assistantReply || "I can help with balance, send, and cashout. Try: 'send 5 cUSD to 0xabc1234' or 'cashout 50 cUSD'." });
});

const confirmSchema = z.object({ userId: z.string(), challengeId: z.string(), answer: z.string() });
chatRouter.post("/confirm", async (req, res) => {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { userId, challengeId, answer } = parsed.data;

  const vr = verifyChallenge(challengeId, answer);
  if (!vr.ok) {
    store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.confirm", status: "error", detail: { reason: vr.reason } });
    return res.json({ reply: `Confirmation failed: ${vr.reason}` });
  }

  const ctx = vr.challenge.context as any;
  if (ctx.kind === "send") {
    try {
      const tx = await wallet.executeSend({ userId, quoteId: ctx.quoteId, to: ctx.to, token: ctx.token, amount: ctx.amount });
      recordPolicySpend(userId, Number(ctx.amount));
      store.addReceipt({ id: `rcpt_${Date.now()}`, userId, kind: "send", amount: String(ctx.amount), token: String(ctx.token), ref: tx.txHash, createdAt: Date.now() });
      store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.send.execute", status: "ok", detail: { txHash: tx.txHash } });
      const txUrl = `https://celoscan.io/tx/${tx.txHash}`;
      return res.json({ reply: `Done ✅ Sent ${formatAmount(ctx.amount, 4)} ${ctx.token} to ${ctx.to.slice(0, 6)}...${ctx.to.slice(-4)}.\nTx: ${txUrl}`, txHash: tx.txHash, txUrl });
    } catch (e) {
      store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.send.execute", status: "error", detail: { error: String((e as any)?.message || e) } });
      return res.status(502).json({ reply: toUserFacingProviderError(e, "wallet") });
    }
  }

  if (ctx.kind === "swap") {
    try {
      const tx = await wallet.executeSwap({ userId, quoteId: ctx.quoteId, fromToken: ctx.fromToken, toToken: ctx.toToken, amountIn: ctx.amountIn, minAmountOut: ctx.minAmountOut });
      recordPolicySpend(userId, Number(ctx.amountIn));
      store.addReceipt({ id: `rcpt_${Date.now()}`, userId, kind: "swap", amount: String(ctx.amountIn), token: `${ctx.fromToken}->${ctx.toToken}`, ref: tx.txHash, createdAt: Date.now() });
      store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.swap.execute", status: "ok", detail: { txHash: tx.txHash } });
      const txUrl = `https://celoscan.io/tx/${tx.txHash}`;
      return res.json({ reply: `Swap complete ✅ ${formatAmount(ctx.amountIn, 4)} ${ctx.fromToken} → ${ctx.toToken}.\nTx: ${txUrl}`, txHash: tx.txHash, txUrl });
    } catch (e) {
      store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.swap.execute", status: "error", detail: { error: String((e as any)?.message || e) } });
      return res.status(502).json({ reply: toUserFacingProviderError(e, "wallet") });
    }
  }

  if (ctx.kind === "cashout") {
    try {
      const beneficiary = ctx.beneficiary || {
        country: offrampConfig.defaultBeneficiary.country,
        bankName: offrampConfig.defaultBeneficiary.bankName || "Default Bank",
        accountName: offrampConfig.defaultBeneficiary.accountName || "Default Recipient",
        accountNumber: offrampConfig.defaultBeneficiary.accountNumber,
        bankCode: offrampConfig.defaultBeneficiary.bankCode,
      };
      // ── Pre-order balance check ── prevent sending if funds are insufficient
      try {
        const preBalData = await wallet.getBalance(userId);
        const tokenKey = String(ctx.token || "cUSD");
        const preBalEntry = preBalData.balances.find((b: any) =>
          b.token.toUpperCase() === tokenKey.toUpperCase()
        );
        const preBalance = Number(preBalEntry?.amount || "0");
        const orderAmount = Number(ctx.amount);
        if (orderAmount > preBalance) {
          store.clearPendingAction(userId);
          return res.json({
            reply: `⚠️ Insufficient balance.\n\nYou have *${preBalance.toFixed(4)} ${tokenKey}* but cashout requires *${orderAmount} ${tokenKey}*.\n\nDeposit more ${tokenKey} or try a smaller amount.`,
          });
        }
      } catch (preBalErr: any) {
        console.warn("[cashout-otp] pre-order balance check failed, proceeding:", preBalErr.message);
      }

      let order: any;
      try {
        order = await offramp.create({ userId, quoteId: ctx.quoteId, fromToken: ctx.token, amount: String(ctx.amount), beneficiary, otp: answer });
      } catch (createErr: any) {
        const errMsg: string = createErr?.message || String(createErr);
        store.clearPendingAction(userId);
        // Surface friendly message for known Paycrest rejection reasons
        if (errMsg.includes("no provider available") || errMsg.includes("no_provider_available")) {
          return res.json({ reply: `❌ No liquidity provider available for this corridor/amount right now.\n\nTry a different amount or try again in a few minutes.` });
        }
        if (errMsg.includes("Rate validation failed")) {
          return res.json({ reply: `❌ Rate expired or invalid. Please start a new cashout to get a fresh quote.` });
        }
        return res.json({ reply: `❌ Cashout failed: ${errMsg}` });
      }
      recordPolicySpend(userId, Number(ctx.amount));
      store.addReceipt({ id: `rcpt_${Date.now()}`, userId, kind: "cashout", amount: String(ctx.amount), token: String(ctx.token), ref: order.payoutId, createdAt: Date.now() });

      let depositTxHash: string | undefined;
      let watcherStatus = "not_sent";
      if (order.depositAddress) {
        const sendQuote = await wallet.prepareSend({
          fromUserId: userId,
          token: (ctx.token || "cUSD") as "CELO" | "cUSD",
          amount: String(ctx.amount),
          to: order.depositAddress,
        });
        const sent = await wallet.executeSend({
          userId,
          quoteId: sendQuote.quoteId,
          token: (ctx.token || "cUSD") as "CELO" | "cUSD",
          amount: String(ctx.amount),
          to: order.depositAddress,
        });
        depositTxHash = sent.txHash;

        const notify = await offramp.notifyDeposit?.({
          orderId: order.payoutId,
          fromToken: (ctx.token || "cUSD") as "CELO" | "cUSD",
          amount: String(ctx.amount),
          txHash: sent.txHash,
          confirmations: offrampConfig.minConfirmations,
        });
        watcherStatus = notify?.status || (notify?.accepted ? "watcher_accepted" : "watcher_not_accepted");
      }

      let refreshedStatusText: string = order.status;
      try {
        // Hold the OTP response until payout pipeline advances or timeout window ends.
        const waitMs = Math.max(5000, offrampConfig.postConfirmWaitMs || 90000);
        const pollMs = Math.max(1000, offrampConfig.postConfirmPollMs || 5000);
        const deadline = Date.now() + waitMs;

        while (Date.now() < deadline) {
          const s = await offramp.status(order.payoutId);
          refreshedStatusText = s.status || order.status;
          if (["paid_out", "settled", "failed"].includes(refreshedStatusText)) break;
          await sleep(pollMs);
        }
      } catch {
        // keep initial status if status fetch fails transiently
      }

      store.addAudit({
        id: `aud_${Date.now()}`,
        ts: Date.now(),
        userId,
        action: "chat.cashout.execute",
        status: "ok",
        detail: { payoutId: order.payoutId, status: refreshedStatusText, depositTxHash, watcherStatus },
      });

      const beneficiaryCurrency = currencyForCountry(beneficiary?.country || "NG");
      const receiveLine = order.receiveAmount ? `\nExpected receive: ${order.receiveAmount} ${beneficiaryCurrency}` : "";
      const depositLine = depositTxHash ? `\nDeposit sent: https://celoscan.io/tx/${depositTxHash}` : "";
      const watcherLine = watcherStatus && watcherStatus !== "watcher_accepted" ? `\nSettlement sync: ${watcherStatus}` : "";
      const trackLine = `\nTrack with: cashout status ${order.payoutId}`;
      const userStatus = refreshedStatusText === "awaiting_deposit"
        ? "processing - deposit is still being verified"
        : humanizeCashoutStatus(refreshedStatusText);
      const headline = refreshedStatusText === "settled"
        ? "✅ Cashout completed"
        : refreshedStatusText === "paid_out"
          ? "✅ Bank transfer initiated"
          : refreshedStatusText === "failed"
            ? "❌ Cashout failed"
            : "⏳ Cashout is processing";
      return res.json({
        reply: `${headline}. Order: ${order.payoutId}\nStatus: ${userStatus}${receiveLine}${depositLine}${watcherLine}${trackLine}`,
        payoutId: order.payoutId,
        depositAddress: order.depositAddress,
        depositTxHash,
      });
    } catch (e) {
      store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.cashout.execute", status: "error", detail: { error: String((e as any)?.message || e) } });
      return res.status(502).json({ reply: toUserFacingProviderError(e, "offramp") });
    }
  }

  return res.json({ reply: "Unknown confirmation context." });
});

chatRouter.get("/receipts", (req, res) => {
  const userId = String(req.query.userId || "");
  if (!userId) return res.status(400).json({ error: "userId_required" });
  return res.json({ receipts: store.listReceipts(userId) });
});

/* ─────────────────────────────────────────────────────────────────────
 *  POST /v1/chat/build-tx
 *
 *  Web clients call this instead of /confirm when they want to sign
 *  the transaction themselves (true client-side signing via wagmi).
 *
 *  Request:  { userId, challengeId, answer, userAddress }
 *  Response: { steps: TxStep[] }
 *    where TxStep = { stepId, description, to, data, value, chainId, gasLimit }
 *
 *  send  → 1 step  (ERC20 transfer OR native CELO transfer)
 *  swap  → 2 steps (Mento allowance + swapIn)
 *  cashout → not supported client-side (server-managed)
 * ───────────────────────────────────────────────────────────────────── */

const CUSD_ADDR = process.env.CUSD_TOKEN_ADDRESS || "0x765DE816845861e75A25fCA122bb6898B8B1282a";
const CELO_ADDR = process.env.CELO_TOKEN_ADDRESS || "0x471EcE3750Da237f93B8E339c536989b8978a438";
const CELO_CHAIN_ID_NUM = Number(process.env.CELO_CHAIN_ID || 42220);

const buildTxSchema = z.object({
  userId: z.string(),
  challengeId: z.string(),
  answer: z.string(),
  userAddress: z.string(),
});

chatRouter.post("/build-tx", async (req, res) => {
  const parsed = buildTxSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { userId, challengeId, answer, userAddress } = parsed.data;

  const vr = verifyChallenge(challengeId, answer);
  if (!vr.ok) {
    return res.status(422).json({ error: `challenge_failed: ${vr.reason}`, steps: [] });
  }

  const ctx = vr.challenge.context as any;
  const provider = new ethers.providers.JsonRpcProvider(turnkeyConfig.celoRpcUrl);

  // ── SEND ──────────────────────────────────────────────────────────────
  if (ctx.kind === "send") {
    const { to, token, amount } = ctx;
    const amountWei = ethers.utils.parseUnits(String(amount), 18);

    // Balance check
    let userBalance = ethers.BigNumber.from(0);
    if (token === "CELO") {
      userBalance = await provider.getBalance(userAddress);
    } else {
      const erc20 = new ethers.Contract(CUSD_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
      userBalance = await erc20.balanceOf(userAddress);
    }

    if (userBalance.lt(amountWei)) {
      return res.status(422).json({
        error: "insufficient_funds_client",
        steps: [],
        details: { required: amountWei.toString(), available: userBalance.toString(), token }
      });
    }

    if (token === "CELO") {
      return res.json({
        steps: [{
          stepId: "send_native",
          description: `Send ${amount} CELO to ${to.slice(0, 6)}...${to.slice(-4)}`,
          to,
          data: "0x",
          value: amountWei.toHexString(),
          chainId: CELO_CHAIN_ID_NUM,
          gasLimit: 21000,
        }],
        context: ctx,
      });
    }

    // cUSD ERC20 transfer
    const iface = new ethers.utils.Interface(["function transfer(address,uint256) returns (bool)"]);
    const data = iface.encodeFunctionData("transfer", [to, amountWei]);
    return res.json({
      steps: [{
        stepId: "send_erc20",
        description: `Send ${amount} cUSD to ${to.slice(0, 6)}...${to.slice(-4)}`,
        to: CUSD_ADDR,
        data,
        value: "0x0",
        chainId: CELO_CHAIN_ID_NUM,
        gasLimit: 120000,
      }],
      context: ctx,
    });
  }

  // ── SWAP (Mento) ──────────────────────────────────────────────────────
  if (ctx.kind === "swap") {
    const { fromToken, toToken, amountIn, minAmountOut } = ctx;
    const fromAddr = fromToken === "CELO" ? CELO_ADDR : CUSD_ADDR;
    const toAddr = toToken === "CELO" ? CELO_ADDR : CUSD_ADDR;
    const amountInWei = ethers.utils.parseUnits(String(amountIn), 18);
    const minOutWei = ethers.utils.parseUnits(String(minAmountOut), 18);

    // Balance check
    let userBalance = ethers.BigNumber.from(0);
    if (fromToken === "CELO") {
      userBalance = await provider.getBalance(userAddress);
    } else {
      const erc20 = new ethers.Contract(CUSD_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
      userBalance = await erc20.balanceOf(userAddress);
    }

    if (userBalance.lt(amountInWei)) {
      return res.status(422).json({
        error: "insufficient_funds_client",
        steps: [],
        details: { required: amountInWei.toString(), available: userBalance.toString(), token: fromToken }
      });
    }

    try {
      const mod = await import("@mento-protocol/mento-sdk");
      const Mento = (mod as any).Mento;
      // const provider = new ethers.providers.JsonRpcProvider(turnkeyConfig.celoRpcUrl); // reused from above
      const mento = await Mento.create(provider as any);

      const allowanceTxObj = await (mento as any).increaseTradingAllowance(fromAddr, amountInWei);
      const swapTxObj = await (mento as any).swapIn(fromAddr, toAddr, amountInWei, minOutWei);

      store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "client.build-tx.swap", status: "ok", detail: { fromToken, toToken, amountIn, userAddress } });

      return res.json({
        steps: [
          {
            stepId: "swap_allowance",
            description: `Approve ${amountIn} ${fromToken} for Mento`,
            to: allowanceTxObj.to || fromAddr,
            data: allowanceTxObj.data || "0x",
            value: "0x0",
            chainId: CELO_CHAIN_ID_NUM,
            gasLimit: 200000,
          },
          {
            stepId: "swap_execute",
            description: `Swap ${amountIn} ${fromToken} → ${toToken} via Mento`,
            to: swapTxObj.to,
            data: swapTxObj.data || "0x",
            value: "0x0",
            chainId: CELO_CHAIN_ID_NUM,
            gasLimit: 300000,
          },
        ],
        context: ctx,
      });
    } catch (e: any) {
      // Fallback: return ERC20 approve to Mento broker
      const MENTO_BROKER = "0x777A8B7db05f97c8Be5E2e7B4A75b4aC3Ab5CAcB";
      const approveIface = new ethers.utils.Interface(["function approve(address,uint256) returns (bool)"]);
      const approveData = approveIface.encodeFunctionData("approve", [MENTO_BROKER, amountInWei]);
      return res.json({
        steps: [{
          stepId: "swap_approve_fallback",
          description: `Approve ${amountIn} ${fromToken} for swap`,
          to: fromAddr,
          data: approveData,
          value: "0x0",
          chainId: CELO_CHAIN_ID_NUM,
          gasLimit: 200000,
        }],
        context: ctx,
        warning: "swap_sdk_fallback",
      });
    }
  }

  return res.status(422).json({ error: "build_tx_unsupported", steps: [] });
});

/* ─────────────────────────────────────────────────────────────────────
 *  POST /v1/chat/record-tx
 *
 *  After the user broadcasts the tx via their wallet, frontend calls
 *  this to persist the receipt for history and audit.
 * ───────────────────────────────────────────────────────────────────── */
const recordTxSchema = z.object({
  userId: z.string(),
  kind: z.enum(["send", "swap"]),
  txHash: z.string(),
  amount: z.string(),
  token: z.string(),
});

chatRouter.post("/record-tx", (req, res) => {
  const parsed = recordTxSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { userId, kind, txHash, amount, token } = parsed.data;

  store.addReceipt({ id: `rcpt_${Date.now()}`, userId, kind, amount, token, ref: txHash, createdAt: Date.now() });
  recordPolicySpend(userId, Number(amount));
  store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "client.record-tx", status: "ok", detail: { kind, txHash, amount, token } });

  return res.json({ ok: true, txHash, txUrl: `https://celoscan.io/tx/${txHash}` });
});

