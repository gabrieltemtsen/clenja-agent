import { Router } from "express";
import { offrampConfig, paraConfig, pricing, safetyConfig, turnkeyConfig, walletConfig } from "../lib/config.js";
import { getParaLiveStatus } from "../adapters/para.js";
import { getOfframpLiveStatus } from "../adapters/offramp.js";
import { getTurnkeyLiveStatus } from "../adapters/turnkey.js";

export const readinessRouter = Router();

readinessRouter.get("/readiness", (_req, res) => {
  const paraLiveConfigured = paraConfig.mode === "live" && Boolean(paraConfig.apiKey);
  const turnkeyLiveConfigured = Boolean(turnkeyConfig.organizationId && turnkeyConfig.apiPublicKey && turnkeyConfig.apiPrivateKey);
  const offrampLiveConfigured = offrampConfig.mode === "live" && Boolean(offrampConfig.apiBase && offrampConfig.apiKey);
  const ready = {
    x402: Boolean(process.env.THIRDWEB_SECRET_KEY && process.env.X402_SERVER_WALLET),
    walletProvider: walletConfig.provider,
    paraLiveConfigured,
    turnkeyLiveConfigured,
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
    turnkey: {
      configured: turnkeyLiveConfigured,
      organizationId: turnkeyConfig.organizationId ? "configured" : "missing",
      apiPublicKey: turnkeyConfig.apiPublicKey ? "configured" : "missing",
      apiPrivateKey: turnkeyConfig.apiPrivateKey ? "configured" : "missing",
      celoRpcUrl: turnkeyConfig.celoRpcUrl,
      liveStatus: getTurnkeyLiveStatus(),
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
