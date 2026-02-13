import { randomUUID } from "node:crypto";
import type { WalletProvider, WalletBalance, PrepareSendInput, PrepareSendResult } from "./wallet.js";
import { paraConfig, safetyConfig } from "../lib/config.js";

type ParaLiveStatus = { mode: "mock" | "live"; healthy: boolean; lastError?: string; lastCheckedAt?: number };
let liveStatus: ParaLiveStatus = { mode: paraConfig.mode === "live" ? "live" : "mock", healthy: paraConfig.mode !== "live" };

function setLiveStatus(ok: boolean, err?: string) {
  liveStatus = { mode: paraConfig.mode === "live" ? "live" : "mock", healthy: ok, lastError: err, lastCheckedAt: Date.now() };
}

export function getParaLiveStatus() {
  return liveStatus;
}

async function paraRequest(path: string, body: unknown) {
  if (!paraConfig.apiBase || !paraConfig.apiKey) throw new Error("para_not_configured");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), paraConfig.timeoutMs);

  try {
    const r = await fetch(`${paraConfig.apiBase}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${paraConfig.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    if (!r.ok) throw new Error(`para_http_${r.status}`);
    const data = await r.json();
    setLiveStatus(true);
    return data;
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "para_timeout" : String(e?.message || e);
    setLiveStatus(false, msg);
    throw new Error(msg);
  } finally {
    clearTimeout(timer);
  }
}

function mockAddress(userId: string) {
  return `0xpara_${userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}`;
}

function assertLiveConfig() {
  if (paraConfig.mode === "live" && (!paraConfig.apiBase || !paraConfig.apiKey) && safetyConfig.strictLiveMode) {
    throw new Error("para_live_strict_config_missing");
  }
}

export class ParaWalletProvider implements WalletProvider {
  async createOrLinkUserWallet(userId: string) {
    assertLiveConfig();
    if (paraConfig.mode === "live") {
      try {
        const data = await paraRequest(paraConfig.endpoints.createOrLink, { userId, chain: "celo" });
        return { walletAddress: String(data.walletAddress || data.address) };
      } catch (e) {
        if (!paraConfig.fallbackToMockOnError) throw e;
      }
    }
    return { walletAddress: mockAddress(userId) };
  }

  async getBalance(userId: string): Promise<WalletBalance> {
    assertLiveConfig();
    if (paraConfig.mode === "live") {
      try {
        const data = await paraRequest(paraConfig.endpoints.balance, { userId, chain: "celo" });
        return {
          walletAddress: String(data.walletAddress || data.address || mockAddress(userId)),
          chain: "celo",
          balances: Array.isArray(data.balances) ? data.balances : [],
        } as WalletBalance;
      } catch (e) {
        if (!paraConfig.fallbackToMockOnError) throw e;
      }
    }
    return {
      walletAddress: mockAddress(userId),
      chain: "celo",
      balances: [
        { token: "CELO", amount: "0", usd: "0" },
        { token: "cUSD", amount: "0", usd: "0" },
      ],
    };
  }

  async prepareSend(input: PrepareSendInput): Promise<PrepareSendResult> {
    assertLiveConfig();
    if (paraConfig.mode === "live") {
      try {
        const data = await paraRequest(paraConfig.endpoints.sendPrepare, input);
        return {
          quoteId: String(data.quoteId || `q_${randomUUID()}`),
          networkFee: String(data.networkFee || "0.0004"),
          estimatedArrival: String(data.estimatedArrival || "instant"),
        };
      } catch (e) {
        if (!paraConfig.fallbackToMockOnError) throw e;
      }
    }
    return {
      quoteId: `q_${randomUUID()}`,
      networkFee: "0.0004",
      estimatedArrival: "instant",
    };
  }

  async executeSend(input: { userId: string; quoteId: string; to: string; token: "CELO" | "cUSD"; amount: string }) {
    assertLiveConfig();
    if (paraConfig.mode === "live") {
      try {
        const data = await paraRequest(paraConfig.endpoints.sendExecute, input);
        return {
          txHash: String(data.txHash || data.hash),
          status: (data.status || "submitted") as "submitted" | "confirmed",
        };
      } catch (e) {
        if (!paraConfig.fallbackToMockOnError) throw e;
      }
    }
    return {
      txHash: `0x${randomUUID().replace(/-/g, "")}`,
      status: "submitted" as const,
    };
  }
}
