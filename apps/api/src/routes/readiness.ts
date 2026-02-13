import { Router } from "express";
import { paraConfig, pricing } from "../lib/config.js";

export const readinessRouter = Router();

readinessRouter.get("/readiness", (_req, res) => {
  const ready = {
    x402: Boolean(process.env.THIRDWEB_SECRET_KEY && process.env.X402_SERVER_WALLET),
    paraLive: paraConfig.mode === "live" && Boolean(paraConfig.apiBase && paraConfig.apiKey),
    stateDb: process.env.STATE_DB_PATH || "./.data/state.json",
  };

  return res.json({
    ok: ready.x402,
    service: "@clenja/api",
    readiness: ready,
    pricing,
  });
});
