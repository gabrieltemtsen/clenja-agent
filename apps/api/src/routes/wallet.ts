import { Router } from "express";
import { z } from "zod";
import { requireX402 } from "../middleware/x402.js";
import { ParaWalletProvider } from "../adapters/para.js";
import { createChallenge, verifyChallenge } from "../lib/stateMachine.js";

export const walletRouter = Router();
const wallet = new ParaWalletProvider();

walletRouter.get("/balance", requireX402("$0.001"), async (req, res) => {
  const userId = String(req.query.userId || "tg:demo");
  const snapshot = await wallet.getBalance(userId);
  return res.json({ ...snapshot, paymentReceiptId: res.getHeader("x-payment-receipt-id") });
});

const prepareSchema = z.object({
  fromUserId: z.string(),
  token: z.enum(["CELO", "cUSD"]),
  amount: z.string(),
  to: z.string(),
});

walletRouter.post("/send/prepare", requireX402("$0.002"), async (req, res) => {
  const parsed = prepareSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const q = await wallet.prepareSend(parsed.data);
  const expectedLast4 = parsed.data.to.slice(-4);
  const ch = createChallenge({
    userId: parsed.data.fromUserId,
    type: "new_recipient_last4",
    expected: expectedLast4,
    context: { ...parsed.data, quoteId: q.quoteId },
  });

  return res.json({
    ...q,
    token: parsed.data.token,
    amount: parsed.data.amount,
    to: parsed.data.to,
    requiresChallenge: true,
    challengeType: "new_recipient_last4",
    challengeId: ch.id,
    challengePrompt: `Type last 4 chars of recipient: ${expectedLast4}`,
    paymentReceiptId: res.getHeader("x-payment-receipt-id"),
  });
});

const confirmSchema = z.object({
  userId: z.string(),
  challengeId: z.string(),
  answer: z.string(),
});

walletRouter.post("/send/confirm", requireX402("$0.002"), async (req, res) => {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const vr = verifyChallenge(parsed.data.challengeId, parsed.data.answer);
  if (!vr.ok) return res.status(400).json({ error: `challenge_${vr.reason}` });

  const c = vr.challenge.context as { quoteId: string; to: string; token: "CELO" | "cUSD"; amount: string };
  const tx = await wallet.executeSend({ userId: parsed.data.userId, quoteId: c.quoteId, to: c.to, token: c.token, amount: c.amount });

  return res.json({
    status: "submitted",
    txHash: tx.txHash,
    paymentReceiptId: res.getHeader("x-payment-receipt-id"),
  });
});
