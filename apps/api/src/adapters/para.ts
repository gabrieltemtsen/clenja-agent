import { randomUUID } from "node:crypto";
import type { WalletProvider, WalletBalance, PrepareSendInput, PrepareSendResult } from "./wallet.js";

/**
 * Para adapter scaffold.
 * Wire actual Para SDK/API calls here after credentials are available.
 */
export class ParaWalletProvider implements WalletProvider {
  async createOrLinkUserWallet(userId: string) {
    return { walletAddress: `0xpara_${userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}` };
  }

  async getBalance(_userId: string): Promise<WalletBalance> {
    return {
      walletAddress: "0xPARA_MOCK_WALLET",
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
