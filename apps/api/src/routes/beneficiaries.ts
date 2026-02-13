import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { store } from "../lib/store.js";

export const beneficiariesRouter = Router();

beneficiariesRouter.get("/", (req, res) => {
  const userId = String(req.query.userId || "");
  if (!userId) return res.status(400).json({ error: "userId_required" });
  return res.json({ beneficiaries: store.listBeneficiaries(userId) });
});

const createSchema = z.object({
  userId: z.string(),
  country: z.string(),
  bankName: z.string(),
  accountName: z.string(),
  accountNumber: z.string().min(6),
});

beneficiariesRouter.post("/", (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { userId, country, bankName, accountName, accountNumber } = parsed.data;
  const last4 = accountNumber.slice(-4);
  const masked = `${"*".repeat(Math.max(0, accountNumber.length - 4))}${last4}`;

  const b = {
    id: `bnf_${randomUUID()}`,
    userId,
    country,
    bankName,
    accountName,
    accountNumberMasked: masked,
    accountNumberLast4: last4,
    createdAt: Date.now(),
  };

  store.addBeneficiary(b);
  return res.json({ beneficiary: b });
});
