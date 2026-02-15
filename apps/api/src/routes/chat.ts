import { Router } from "express";
import { z } from "zod";
import { routeIntent } from "../lib/intentRouter.js";
import { checkPolicy, recordPolicySpend } from "../lib/policy.js";
import { createChallenge, verifyChallenge } from "../lib/stateMachine.js";
import { makeWalletProvider } from "../adapters/provider.js";
import { LiveOfframpProvider } from "../adapters/offramp.js";
import { store } from "../lib/store.js";
import { checkRateLimit } from "../lib/rateLimit.js";
import { toUserFacingProviderError } from "../lib/providerErrors.js";

export const chatRouter = Router();
const wallet = makeWalletProvider();
const offramp = new LiveOfframpProvider();

function fuzzyIncludes(a: string, b: string) {
  const aa = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  const bb = b.toLowerCase().replace(/[^a-z0-9]/g, "");
  return aa.includes(bb) || bb.includes(aa);
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
      reply: "I can do: balance, history, status, send, and cashout. Examples: 'send 5 cUSD to 0xabc1234', 'cashout 50 cUSD', 'cashout 50 cUSD to Gabriel'."
    });
  }

  if (intent.kind === "balance") {
    try {
      const b = await wallet.getBalance(userId);
      return res.json({ reply: `✅ Balance: ${b.balances.map((x) => `${x.amount} ${x.token}`).join(", ")}`, data: b });
    } catch (e) {
      return res.status(502).json({ reply: toUserFacingProviderError(e, "wallet") });
    }
  }

  if (intent.kind === "sendability_check") {
    try {
      const b = await wallet.getBalance(userId);
      const celo = Number(b.balances.find((x) => x.token === "CELO")?.amount || "0");
      const reply = celo > 0
        ? `Yes — you can send CELO. You currently have about ${celo} CELO. Say: send <amount> CELO to <0x...>.`
        : "Not yet — you currently have 0 CELO. Fund your wallet first, then I can send instantly.";
      return res.json({ reply, data: b });
    } catch (e) {
      return res.status(502).json({ reply: toUserFacingProviderError(e, "wallet") });
    }
  }

  if (intent.kind === "history") {
    const receipts = store.listReceipts(userId).slice(0, 10);
    return res.json({ reply: `🧾 Found ${receipts.length} recent records.`, receipts });
  }

  if (intent.kind === "address") {
    try {
      const w = await wallet.createOrLinkUserWallet(userId);
      return res.json({ reply: `🏦 Wallet address: ${w.walletAddress}`, walletAddress: w.walletAddress });
    } catch (e) {
      return res.status(502).json({ reply: toUserFacingProviderError(e, "wallet") });
    }
  }

  if (intent.kind === "status") {
    return res.json({ reply: "🟢 CLENJA API is online. Use /v1/readiness for full provider status." });
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
      return res.json({ reply: `Confirm send by typing last 4 chars of recipient (${last4})`, challengeId: ch.id, action: "awaiting_confirmation" });
    } catch (e) {
      return res.status(502).json({ reply: toUserFacingProviderError(e, "wallet") });
    }
  }

  if (intent.kind === "cashout") {
    const pc = checkPolicy({ userId, action: "cashout", amount: Number(intent.amount), token: intent.token as "CELO" | "cUSD" });
    if (!pc.ok) {
      store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.cashout.blocked", status: "error", detail: { reason: pc.reason } });
      return res.json({ reply: `❌ Blocked by policy: ${pc.reason}` });
    }

    let beneficiary: { country: string; bankName: string; accountName: string; accountNumber: string } | undefined;
    if (intent.beneficiaryName) {
      const matches = store.listBeneficiaries(userId).filter((b) => fuzzyIncludes(b.accountName, intent.beneficiaryName!));
      if (matches.length === 1) {
        const found = matches[0];
        beneficiary = { country: found.country, bankName: found.bankName, accountName: found.accountName, accountNumber: found.accountNumberMasked };
      } else if (matches.length > 1) {
        return res.json({ reply: `I found multiple beneficiaries for '${intent.beneficiaryName}': ${matches.map((m) => m.accountName).join(", ")}. Please be more specific.` });
      } else {
        return res.json({ reply: `No beneficiary found for '${intent.beneficiaryName}'. Save one in /beneficiaries first.` });
      }
    }

    try {
      const quote = await offramp.quote({ userId, fromToken: intent.token as "cUSD" | "CELO", amount: intent.amount, country: beneficiary?.country as any || "NG", currency: "NGN" });
      const otp = "123456";
      const ch = createChallenge({ userId, type: "cashout_otp", expected: otp, context: { kind: "cashout", quoteId: quote.quoteId, amount: intent.amount, token: intent.token, beneficiary } });
      return res.json({ reply: `💸 Cashout quote ready: receive ${quote.receiveAmount} NGN. Reply with OTP 123456 to confirm.`, quote, challengeId: ch.id, action: "awaiting_confirmation" });
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
      return res.json({ reply: `✅ Send submitted. Tx: ${tx.txHash}`, txHash: tx.txHash });
    } catch (e) {
      store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.send.execute", status: "error", detail: { error: String((e as any)?.message || e) } });
      return res.status(502).json({ reply: toUserFacingProviderError(e, "wallet") });
    }
  }

  if (ctx.kind === "cashout") {
    try {
      const beneficiary = ctx.beneficiary || { country: "NG", bankName: "Mock Bank", accountName: "Demo User", accountNumber: "0000000000" };
      const order = await offramp.create({ userId, quoteId: ctx.quoteId, beneficiary, otp: answer });
      recordPolicySpend(userId, Number(ctx.amount));
      store.addReceipt({ id: `rcpt_${Date.now()}`, userId, kind: "cashout", amount: String(ctx.amount), token: String(ctx.token), ref: order.payoutId, createdAt: Date.now() });
      store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.cashout.execute", status: "ok", detail: { payoutId: order.payoutId } });
      return res.json({ reply: `✅ Cashout created. Payout: ${order.payoutId} (${order.status})`, payoutId: order.payoutId });
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
