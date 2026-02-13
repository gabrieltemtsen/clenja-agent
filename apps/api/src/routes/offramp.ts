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
  store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId: parsed.data.userId, action: "offramp.quote", status: "ok", detail: { amount: parsed.data.amount, token: parsed.data.fromToken, country: parsed.data.country } });
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

  const idemKey = String(req.header("idempotency-key") || "");
  if (idemKey) {
    const prior = store.getIdempotency("offramp.create", idemKey);
    if (prior) return res.json(prior.response);
  }

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

  const response = { ...order, paymentReceiptId: res.getHeader("x-payment-receipt-id") };
  if (idemKey) store.putIdempotency({ key: idemKey, action: "offramp.create", response, createdAt: Date.now() });
  store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId: payload.userId, action: "offramp.create", status: "ok", detail: { payoutId: order.payoutId, beneficiaryId: payload.beneficiaryId ?? "inline" } });

  return res.json(response);
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

  const current = store.getCashout(payoutId);
  if (!current) return res.status(404).json({ error: "not_found" });

  const allowed: Record<string, string[]> = {
    pending: ["processing", "failed"],
    processing: ["settled", "failed"],
    settled: [],
    failed: [],
  };
  if (!allowed[current.status].includes(status)) {
    return res.status(400).json({ error: "invalid_transition", from: current.status, to: status });
  }

  const updated = store.updateCashoutStatus(payoutId, status as "pending" | "processing" | "settled" | "failed");
  if (!updated) return res.status(404).json({ error: "not_found" });
  store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId: updated.userId, action: "offramp.status.update", status: "ok", detail: { payoutId, from: current.status, to: status } });
  return res.json({ payoutId: updated.payoutId, status: updated.status, updatedAt: updated.updatedAt });
});
