import { Router } from "express";
import { ParaWalletProvider } from "../adapters/para.js";
import { store } from "../lib/store.js";

export const dashboardRouter = Router();
const wallet = new ParaWalletProvider();

dashboardRouter.get("/overview", async (req, res) => {
  const userId = String(req.query.userId || "");
  if (!userId) return res.status(400).json({ error: "userId_required" });

  const balance = await wallet.getBalance(userId);
  const receipts = store.listReceipts(userId);
  const cashouts = store.listCashouts(userId);
  return res.json({ balance, receipts, cashouts });
});
