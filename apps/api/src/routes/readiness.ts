import { Router } from "express";
import { paraConfig, pricing } from "../lib/config.js";
import { getParaLiveStatus } from "../adapters/para.js";

export const readinessRouter = Router();

readinessRouter.get("/readiness", (_req, res) => {
  const paraLiveConfigured = paraConfig.mode === "live" && Boolean(paraConfig.apiBase && paraConfig.apiKey);
  const ready = {
    x402: Boolean(process.env.THIRDWEB_SECRET_KEY && process.env.X402_SERVER_WALLET),
    paraLiveConfigured,
    stateDb: process.env.STATE_DB_PATH || "./.data/state.json",
  };

  return res.json({
    ok: ready.x402,
    service: "@clenja/api",
    readiness: ready,
    para: {
      mode: paraConfig.mode,
      apiBase: paraConfig.apiBase ? "configured" : "missing",
      timeoutMs: paraConfig.timeoutMs,
      fallbackToMockOnError: paraConfig.fallbackToMockOnError,
      endpoints: paraConfig.endpoints,
      liveStatus: getParaLiveStatus(),
    },
    pricing,
  });
});
