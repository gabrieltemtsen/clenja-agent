import { Router } from "express";
import { z } from "zod";
import { requireX402 } from "../middleware/x402.js";
import { LiveOfframpProvider } from "../adapters/offramp.js";
import { pricing } from "../lib/config.js";
import { store } from "../lib/store.js";

export const offrampRouter = Router();
const provider = new LiveOfframpProvider();

const quoteSchema = z.object({
  userId: z.string(),
  fromToken: z.enum(["cUSD", "CELO"]),
  amount: z.string(),
  country: z.enum(["NG", "KE", "GH", "ZA"]),
  currency: z.enum(["NGN", "KES", "GHS", "ZAR"]),
});

offrampRouter.post("/quote", requireX402(pricing.offrampQuote), async (req, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const quote = await provider.quote(parsed.data);
  return res.json({ ...quote, paymentReceiptId: res.getHeader("x-payment-receipt-id") });
});

const createSchema = z.object({
  userId: z.string(),
  quoteId: z.string(),
  beneficiaryId: z.string().optional(),
  beneficiary: z.object({
    country: z.string(),
    bankName: z.string(),
    accountName: z.string(),
    accountNumber: z.string(),
  }).optional(),
  otp: z.string().min(4),
});

offrampRouter.post("/create", requireX402(pricing.offrampCreate), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const payload = parsed.data;
  let beneficiary = payload.beneficiary;

  if (!beneficiary && payload.beneficiaryId) {
    const found = store.listBeneficiaries(payload.userId).find((b) => b.id === payload.beneficiaryId);
    if (!found) return res.status(400).json({ error: "beneficiary_not_found" });
    beneficiary = {
      country: found.country,
      bankName: found.bankName,
      accountName: found.accountName,
      accountNumber: found.accountNumberMasked,
    };
  }

  if (!beneficiary) return res.status(400).json({ error: "beneficiary_required" });

  const order = await provider.create({ userId: payload.userId, quoteId: payload.quoteId, beneficiary, otp: payload.otp });
  store.addCashout({
    payoutId: order.payoutId,
    userId: payload.userId,
    status: order.status,
    amount: "unknown",
    token: "unknown",
    beneficiaryId: payload.beneficiaryId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return res.json({ ...order, paymentReceiptId: res.getHeader("x-payment-receipt-id") });
});

offrampRouter.get("/status/:payoutId", requireX402(pricing.offrampQuote), async (req, res) => {
  const payoutId = req.params.payoutId;
  const order = store.getCashout(payoutId);
  if (!order) return res.status(404).json({ error: "not_found" });
  return res.json({ payoutId: order.payoutId, status: order.status, updatedAt: order.updatedAt });
});

offrampRouter.post("/status/:payoutId", requireX402(pricing.offrampCreate), async (req, res) => {
  const payoutId = req.params.payoutId;
  const status = String(req.body?.status || "");
  if (!["pending", "processing", "settled", "failed"].includes(status)) {
    return res.status(400).json({ error: "invalid_status" });
  }
  const updated = store.updateCashoutStatus(payoutId, status as "pending" | "processing" | "settled" | "failed");
  if (!updated) return res.status(404).json({ error: "not_found" });
  return res.json({ payoutId: updated.payoutId, status: updated.status, updatedAt: updated.updatedAt });
});
