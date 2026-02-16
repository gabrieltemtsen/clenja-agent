import { randomUUID } from "node:crypto";
import { Para as ParaServer } from "@getpara/server-sdk";
import type { WalletProvider, WalletBalance, PrepareSendInput, PrepareSendResult, PrepareSwapInput, PrepareSwapResult } from "./wallet.js";
import { paraConfig, safetyConfig } from "../lib/config.js";

type ParaLiveStatus = { mode: "mock" | "live"; healthy: boolean; lastError?: string; lastCheckedAt?: number };
let liveStatus: ParaLiveStatus = { mode: paraConfig.mode === "live" ? "live" : "mock", healthy: paraConfig.mode !== "live" };

function setLiveStatus(ok: boolean, err?: string) {
  liveStatus = { mode: paraConfig.mode === "live" ? "live" : "mock", healthy: ok, lastError: err, lastCheckedAt: Date.now() };
}

export function getParaLiveStatus() {
  return liveStatus;
}

let paraClient: ParaServer | null = null;
const walletCache = new Map<string, any>();

function getParaClient() {
  if (!paraClient) {
    if (!paraConfig.apiKey) throw new Error("para_not_configured");
    paraClient = new ParaServer(paraConfig.apiKey);
  }
  return paraClient;
}

async function getOrCreateUserWallet(userId: string): Promise<any> {
  const cached = walletCache.get(userId);
  if (cached) return cached;

  const para = getParaClient();
  await para.ready();
  const pregenId = { telegramUserId: userId };

  const existing = (await para.getPregenWallets({ pregenId })) || [];
  const evmWallet = existing.find((w: any) => String((w as any)?.type || "").toUpperCase() === "EVM") || existing[0];
  if (evmWallet) {
    walletCache.set(userId, evmWallet);
    return evmWallet;
  }

  const created = await para.createPregenWallet({ type: "EVM", pregenId });
  walletCache.set(userId, created);
  return created;
}

function assertLiveConfig() {
  if (paraConfig.mode === "live" && !paraConfig.apiKey && safetyConfig.strictLiveMode) {
    throw new Error("para_live_strict_config_missing");
  }
}

function normalizeCeloAmount(value: string | number | undefined) {
  const raw = String(value ?? "0");
  if (!raw || raw === "0") return "0";
  const maybeInt = /^\d+$/.test(raw);
  if (!maybeInt) return raw;
  // If this looks like wei, convert to CELO.
  if (raw.length > 10) {
    const padded = raw.padStart(19, "0");
    const whole = padded.slice(0, -18).replace(/^0+/, "") || "0";
    const frac = padded.slice(-18).replace(/0+$/, "");
    return frac ? `${whole}.${frac}` : whole;
  }
  return raw;
}

function mockAddress(userId: string) {
  return `0xpara_${userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}`;
}

export class ParaWalletProvider implements WalletProvider {
  async createOrLinkUserWallet(userId: string) {
    assertLiveConfig();
    if (paraConfig.mode === "live") {
      try {
        const w = await getOrCreateUserWallet(userId);
        setLiveStatus(true);
        return { walletAddress: String((w as any).address || (w as any).walletAddress) };
      } catch (e: any) {
        const msg = String(e?.message || e);
        setLiveStatus(false, msg);
        if (!paraConfig.fallbackToMockOnError) throw new Error(msg);
      }
    }
    return { walletAddress: mockAddress(userId) };
  }

  async getBalance(userId: string): Promise<WalletBalance> {
    assertLiveConfig();
    if (paraConfig.mode === "live") {
      try {
        const para = getParaClient();
        await para.ready();
        const w = await getOrCreateUserWallet(userId);
        const raw = await para.getWalletBalance({
          walletId: String((w as any).id),
          rpcUrl: process.env.PARA_CELO_RPC_URL || "https://forno.celo.org",
        });

        const celoAmount = normalizeCeloAmount(raw as any);
        setLiveStatus(true);
        return {
          walletAddress: String((w as any).address || (w as any).walletAddress),
          chain: "celo",
          balances: [
            { token: "CELO", amount: celoAmount, usd: "0" },
            { token: "cUSD", amount: "0", usd: "0" },
          ],
        } as WalletBalance;
      } catch (e: any) {
        const msg = String(e?.message || e);
        setLiveStatus(false, msg);
        if (!paraConfig.fallbackToMockOnError) throw new Error(msg);
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
    if (paraConfig.mode === "live" && !paraConfig.fallbackToMockOnError) {
      throw new Error("para_live_send_not_implemented");
    }
    return {
      quoteId: `q_${randomUUID()}`,
      networkFee: "0.0004",
      estimatedArrival: "instant",
    };
  }

  async executeSend(_input: { userId: string; quoteId: string; to: string; token: "CELO" | "cUSD"; amount: string }) {
    assertLiveConfig();
    if (paraConfig.mode === "live" && !paraConfig.fallbackToMockOnError) {
      throw new Error("para_live_send_not_implemented");
    }
    return {
      txHash: `0x${randomUUID().replace(/-/g, "")}`,
      status: "submitted" as const,
    };
  }

  async prepareSwap(_input: PrepareSwapInput): Promise<PrepareSwapResult> {
    throw new Error("swap_not_supported_for_provider");
  }

  async executeSwap(_input: { userId: string; quoteId: string; fromToken: "CELO" | "cUSD"; toToken: "CELO" | "cUSD"; amountIn: string; minAmountOut: string }): Promise<{ txHash: string; status: "submitted" | "confirmed" }> {
    throw new Error("swap_not_supported_for_provider");
  }
}
