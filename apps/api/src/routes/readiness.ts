import { Router } from "express";
import { offrampConfig, paraConfig, pricing, safetyConfig } from "../lib/config.js";
import { getParaLiveStatus } from "../adapters/para.js";
import { getOfframpLiveStatus } from "../adapters/offramp.js";

export const readinessRouter = Router();

readinessRouter.get("/readiness", (_req, res) => {
  const paraLiveConfigured = paraConfig.mode === "live" && Boolean(paraConfig.apiKey);
  const offrampLiveConfigured = offrampConfig.mode === "live" && Boolean(offrampConfig.apiBase && offrampConfig.apiKey);
  const ready = {
    x402: Boolean(process.env.THIRDWEB_SECRET_KEY && process.env.X402_SERVER_WALLET),
    paraLiveConfigured,
    offrampLiveConfigured,
    stateDb: process.env.STATE_DB_PATH || "./.data/state.json",
  };

  return res.json({
    ok: ready.x402,
    service: "@clenja/api",
    readiness: ready,
    para: {
      mode: paraConfig.mode,
      apiBase: paraConfig.apiBase ? "configured (legacy)" : "n/a (server-sdk)",
      timeoutMs: paraConfig.timeoutMs,
      fallbackToMockOnError: paraConfig.fallbackToMockOnError,
      endpoints: paraConfig.endpoints,
      liveStatus: getParaLiveStatus(),
    },
    offramp: {
      mode: offrampConfig.mode,
      apiBase: offrampConfig.apiBase ? "configured" : "missing",
      timeoutMs: offrampConfig.timeoutMs,
      fallbackToMockOnError: offrampConfig.fallbackToMockOnError,
      endpoints: offrampConfig.endpoints,
      liveStatus: getOfframpLiveStatus(),
    },
    safety: safetyConfig,
    pricing,
  });
});
