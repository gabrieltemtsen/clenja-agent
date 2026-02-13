import { Router } from "express";
import { store } from "../lib/store.js";

export const auditRouter = Router();

auditRouter.get("/audit", (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  return res.json({ audit: store.listAudit(userId) });
});
