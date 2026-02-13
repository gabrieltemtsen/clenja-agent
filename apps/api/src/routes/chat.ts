import { Router } from "express";
import { z } from "zod";
import { parseIntent } from "../lib/intents.js";
import { checkPolicy, recordPolicySpend } from "../lib/policy.js";
import { createChallenge, verifyChallenge } from "../lib/stateMachine.js";
import { ParaWalletProvider } from "../adapters/para.js";
import { LiveOfframpProvider } from "../adapters/offramp.js";
import { store } from "../lib/store.js";
import { checkRateLimit } from "../lib/rateLimit.js";

export const chatRouter = Router();
const wallet = new ParaWalletProvider();
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

  const intent = parseIntent(text);
  store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.message", status: "ok", detail: { text, intent: intent.kind } });

  if (intent.kind === "help") {
    return res.json({
      reply: "I can do: balance, history, status, send, and cashout. Examples: 'send 5 cUSD to 0xabc1234', 'cashout 50 cUSD', 'cashout 50 cUSD to Gabriel'."
    });
  }

  if (intent.kind === "balance") {
    const b = await wallet.getBalance(userId);
    return res.json({ reply: `✅ Balance: ${b.balances.map((x) => `${x.amount} ${x.token}`).join(", ")}`, data: b });
  }

  if (intent.kind === "history") {
    const receipts = store.listReceipts(userId).slice(0, 10);
    return res.json({ reply: `🧾 Found ${receipts.length} recent records.`, receipts });
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

    const q = await wallet.prepareSend({ fromUserId: userId, token: intent.token as "CELO" | "cUSD", amount: intent.amount, to: intent.to });
    const last4 = intent.to.slice(-4);
    const ch = createChallenge({ userId, type: "new_recipient_last4", expected: last4, context: { kind: "send", quoteId: q.quoteId, to: intent.to, token: intent.token, amount: intent.amount } });
    return res.json({ reply: `Confirm send by typing last 4 chars of recipient (${last4})`, challengeId: ch.id, action: "awaiting_confirmation" });
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

    const quote = await offramp.quote({ userId, fromToken: intent.token as "cUSD" | "CELO", amount: intent.amount, country: beneficiary?.country as any || "NG", currency: "NGN" });
    const otp = "123456";
    const ch = createChallenge({ userId, type: "cashout_otp", expected: otp, context: { kind: "cashout", quoteId: quote.quoteId, amount: intent.amount, token: intent.token, beneficiary } });
    return res.json({ reply: `💸 Cashout quote ready: receive ${quote.receiveAmount} NGN. Reply with OTP 123456 to confirm.`, quote, challengeId: ch.id, action: "awaiting_confirmation" });
  }

  return res.json({ reply: "I can help with balance, send, and cashout. Try: 'send 5 cUSD to 0xabc1234' or 'cashout 50 cUSD'." });
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
    const tx = await wallet.executeSend({ userId, quoteId: ctx.quoteId, to: ctx.to, token: ctx.token, amount: ctx.amount });
    recordPolicySpend(userId, Number(ctx.amount));
    store.addReceipt({ id: `rcpt_${Date.now()}`, userId, kind: "send", amount: String(ctx.amount), token: String(ctx.token), ref: tx.txHash, createdAt: Date.now() });
    store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.send.execute", status: "ok", detail: { txHash: tx.txHash } });
    return res.json({ reply: `✅ Send submitted. Tx: ${tx.txHash}`, txHash: tx.txHash });
  }

  if (ctx.kind === "cashout") {
    const beneficiary = ctx.beneficiary || { country: "NG", bankName: "Mock Bank", accountName: "Demo User", accountNumber: "0000000000" };
    const order = await offramp.create({ userId, quoteId: ctx.quoteId, beneficiary, otp: answer });
    recordPolicySpend(userId, Number(ctx.amount));
    store.addReceipt({ id: `rcpt_${Date.now()}`, userId, kind: "cashout", amount: String(ctx.amount), token: String(ctx.token), ref: order.payoutId, createdAt: Date.now() });
    store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "chat.cashout.execute", status: "ok", detail: { payoutId: order.payoutId } });
    return res.json({ reply: `✅ Cashout created. Payout: ${order.payoutId} (${order.status})`, payoutId: order.payoutId });
  }

  return res.json({ reply: "Unknown confirmation context." });
});

chatRouter.get("/receipts", (req, res) => {
  const userId = String(req.query.userId || "");
  if (!userId) return res.status(400).json({ error: "userId_required" });
  return res.json({ receipts: store.listReceipts(userId) });
});
