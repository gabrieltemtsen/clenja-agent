import { randomUUID } from "node:crypto";
import type { WalletProvider, WalletBalance, PrepareSendInput, PrepareSendResult } from "./wallet.js";
import { paraConfig } from "../lib/config.js";

async function paraRequest(path: string, body: unknown) {
  if (!paraConfig.apiBase || !paraConfig.apiKey) throw new Error("para_not_configured");
  const r = await fetch(`${paraConfig.apiBase}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${paraConfig.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`para_http_${r.status}`);
  return r.json();
}

export class ParaWalletProvider implements WalletProvider {
  async createOrLinkUserWallet(userId: string) {
    if (paraConfig.mode === "live") {
      // endpoint path is configurable pattern for rapid provider onboarding
      const data = await paraRequest("/wallet/create-or-link", { userId, chain: "celo" });
      return { walletAddress: String(data.walletAddress || data.address) };
    }
    return { walletAddress: `0xpara_${userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}` };
  }

  async getBalance(userId: string): Promise<WalletBalance> {
    if (paraConfig.mode === "live") {
      const data = await paraRequest("/wallet/balance", { userId, chain: "celo" });
      return {
        walletAddress: String(data.walletAddress || data.address),
        chain: "celo",
        balances: Array.isArray(data.balances) ? data.balances : [],
      } as WalletBalance;
    }
    return {
      walletAddress: "0xPARA_MOCK_WALLET",
      chain: "celo",
      balances: [
        { token: "CELO", amount: "0", usd: "0" },
        { token: "cUSD", amount: "0", usd: "0" },
      ],
    };
  }

  async prepareSend(input: PrepareSendInput): Promise<PrepareSendResult> {
    if (paraConfig.mode === "live") {
      const data = await paraRequest("/wallet/send/prepare", input);
      return {
        quoteId: String(data.quoteId || `q_${randomUUID()}`),
        networkFee: String(data.networkFee || "0.0004"),
        estimatedArrival: String(data.estimatedArrival || "instant"),
      };
    }
    return {
      quoteId: `q_${randomUUID()}`,
      networkFee: "0.0004",
      estimatedArrival: "instant",
    };
  }

  async executeSend(input: { userId: string; quoteId: string; to: string; token: "CELO" | "cUSD"; amount: string }) {
    if (paraConfig.mode === "live") {
      const data = await paraRequest("/wallet/send/execute", input);
      return {
        txHash: String(data.txHash || data.hash),
        status: (data.status || "submitted") as "submitted" | "confirmed",
      };
    }
    return {
      txHash: `0x${randomUUID().replace(/-/g, "")}`,
      status: "submitted" as const,
    };
  }
}
