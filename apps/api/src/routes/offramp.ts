import { Router } from "express";
import { z } from "zod";
import { requireX402 } from "../middleware/x402.js";
import { MockOfframpProvider } from "../adapters/offramp.js";

export const offrampRouter = Router();
const provider = new MockOfframpProvider();

const quoteSchema = z.object({
  userId: z.string(),
  fromToken: z.enum(["cUSD", "CELO"]),
  amount: z.string(),
  country: z.enum(["NG", "KE", "GH", "ZA"]),
  currency: z.enum(["NGN", "KES", "GHS", "ZAR"]),
});

offrampRouter.post("/quote", requireX402("$0.005"), async (req, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const quote = await provider.quote(parsed.data);
  return res.json({ ...quote, paymentReceiptId: res.getHeader("x-payment-receipt-id") });
});

const createSchema = z.object({
  userId: z.string(),
  quoteId: z.string(),
  beneficiary: z.object({
    country: z.string(),
    bankName: z.string(),
    accountName: z.string(),
    accountNumber: z.string(),
  }),
  otp: z.string().min(4),
});

offrampRouter.post("/create", requireX402("$0.01"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const order = await provider.create(parsed.data);
  return res.json({ ...order, paymentReceiptId: res.getHeader("x-payment-receipt-id") });
});
