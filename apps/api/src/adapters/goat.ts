import type { WalletProvider, WalletBalance, PrepareSendInput, PrepareSendResult, PrepareSwapInput, PrepareSwapResult } from "./wallet.js";
import { TurnkeyWalletProvider } from "./turnkey.js";
import { store } from "../lib/store.js";

/**
 * GOAT execution engine foundation.
 *
 * Phase 1 (this PR): keep behavior stable by delegating to the current Turnkey-backed implementation,
 * while centralizing the engine switch behind this adapter.
 */
export class GoatWalletProvider implements WalletProvider {
  private readonly legacy = new TurnkeyWalletProvider();

  async createOrLinkUserWallet(userId: string): Promise<{ walletAddress: string }> {
    const r = await this.legacy.createOrLinkUserWallet(userId);
    store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "goat.wallet.createOrLink", status: "ok" });
    return r;
  }

  async getBalance(userId: string): Promise<WalletBalance> {
    const r = await this.legacy.getBalance(userId);
    store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId, action: "goat.wallet.balance", status: "ok" });
    return r;
  }

  async prepareSend(input: PrepareSendInput): Promise<PrepareSendResult> {
    const r = await this.legacy.prepareSend(input);
    store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId: input.fromUserId, action: "goat.wallet.prepareSend", status: "ok" });
    return r;
  }

  async executeSend(input: { userId: string; quoteId: string; to: string; token: "CELO" | "cUSD"; amount: string }): Promise<{ txHash: string; status: "submitted" | "confirmed" }> {
    const r = await this.legacy.executeSend(input);
    store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId: input.userId, action: "goat.wallet.executeSend", status: "ok", detail: { txHash: r.txHash } });
    return r;
  }

  async prepareSwap(input: PrepareSwapInput): Promise<PrepareSwapResult> {
    const r = await this.legacy.prepareSwap(input);
    store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId: input.fromUserId, action: "goat.wallet.prepareSwap", status: "ok" });
    return r;
  }

  async executeSwap(input: { userId: string; quoteId: string; fromToken: "CELO" | "cUSD"; toToken: "CELO" | "cUSD"; amountIn: string; minAmountOut: string }): Promise<{ txHash: string; status: "submitted" | "confirmed" }> {
    const r = await this.legacy.executeSwap(input);
    store.addAudit({ id: `aud_${Date.now()}`, ts: Date.now(), userId: input.userId, action: "goat.wallet.executeSwap", status: "ok", detail: { txHash: r.txHash } });
    return r;
  }
}
