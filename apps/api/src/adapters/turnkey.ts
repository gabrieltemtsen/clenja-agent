import { randomUUID } from "node:crypto";
import type { WalletProvider, WalletBalance, PrepareSendInput, PrepareSendResult } from "./wallet.js";
import { safetyConfig, turnkeyConfig } from "../lib/config.js";

type TurnkeyLiveStatus = { mode: "mock" | "live"; healthy: boolean; lastError?: string; lastCheckedAt?: number };
let liveStatus: TurnkeyLiveStatus = {
  mode: "live",
  healthy: false,
  lastError: "turnkey_not_initialized",
  lastCheckedAt: Date.now(),
};

function setLiveStatus(ok: boolean, err?: string) {
  liveStatus = { mode: "live", healthy: ok, lastError: err, lastCheckedAt: Date.now() };
}

export function getTurnkeyLiveStatus() {
  return liveStatus;
}

const walletByUser = new Map<string, string>();

function assertConfig() {
  const missing = !turnkeyConfig.organizationId || !turnkeyConfig.apiPublicKey || !turnkeyConfig.apiPrivateKey;
  if (missing && safetyConfig.strictLiveMode) throw new Error("turnkey_live_strict_config_missing");
  return !missing;
}

function pseudoAddress(userId: string) {
  const clean = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32).padEnd(32, "0");
  return `0x${clean}`.slice(0, 42);
}

export class TurnkeyWalletProvider implements WalletProvider {
  async createOrLinkUserWallet(userId: string) {
    const ok = assertConfig();
    if (!ok) {
      setLiveStatus(false, "turnkey_not_configured");
      return { walletAddress: pseudoAddress(userId) };
    }

    // PR33 scaffold: provider switch + env plumbing only.
    // Real wallet creation/signing lands in PR34/PR35.
    const address = walletByUser.get(userId) || pseudoAddress(userId);
    walletByUser.set(userId, address);
    setLiveStatus(false, "turnkey_live_wallet_not_implemented");
    return { walletAddress: address };
  }

  async getBalance(userId: string): Promise<WalletBalance> {
    const w = await this.createOrLinkUserWallet(userId);
    return {
      walletAddress: w.walletAddress,
      chain: "celo",
      balances: [
        { token: "CELO", amount: "0", usd: "0" },
        { token: "cUSD", amount: "0", usd: "0" },
      ],
    };
  }

  async prepareSend(_input: PrepareSendInput): Promise<PrepareSendResult> {
    return {
      quoteId: `q_${randomUUID()}`,
      networkFee: "0.0004",
      estimatedArrival: "instant",
    };
  }

  async executeSend(_input: { userId: string; quoteId: string; to: string; token: "CELO" | "cUSD"; amount: string }) {
    return {
      txHash: `0x${randomUUID().replace(/-/g, "")}`,
      status: "submitted" as const,
    };
  }
}
