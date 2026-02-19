import { ethers } from "ethers";
import type { WalletProvider, WalletBalance, PrepareSendInput, PrepareSendResult, PrepareSwapInput, PrepareSwapResult } from "./wallet.js";
import { turnkeyConfig } from "../lib/config.js";
import { TurnkeyWalletProvider } from "./turnkey.js";

const CUSD_ADDR = process.env.CUSD_TOKEN_ADDRESS || "0x765DE816845861e75A25fCA122bb6898B8B1282a";

export class ConnectedWalletProvider implements WalletProvider {
    private inner: TurnkeyWalletProvider;

    constructor() {
        this.inner = new TurnkeyWalletProvider();
    }

    async createOrLinkUserWallet(userId: string) {
        if (userId.startsWith("wallet:")) {
            const address = userId.split(":")[1];
            return { walletAddress: address };
        }
        return this.inner.createOrLinkUserWallet(userId);
    }

    async getBalance(userId: string): Promise<WalletBalance> {
        if (userId.startsWith("wallet:")) {
            const address = userId.split(":")[1];
            const provider = new ethers.providers.JsonRpcProvider(turnkeyConfig.celoRpcUrl);

            try {
                const celoWei = await provider.getBalance(address);
                const celo = ethers.utils.formatUnits(celoWei, 18);

                const cusdContract = new ethers.Contract(CUSD_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
                const cusdWei = await cusdContract.balanceOf(address);
                const cusd = ethers.utils.formatUnits(cusdWei, 18);

                return {
                    walletAddress: address,
                    chain: "celo",
                    balances: [
                        { token: "CELO", amount: celo, usd: "0" },
                        { token: "cUSD", amount: cusd, usd: cusd },
                    ],
                };
            } catch (e) {
                console.error("Failed to fetch connected wallet balance", e);
                // Fallback or rethrow? likely rethrow to show error
                throw e;
            }
        }
        return this.inner.getBalance(userId);
    }

    async prepareSend(input: PrepareSendInput): Promise<PrepareSendResult> {
        return this.inner.prepareSend(input);
    }

    async executeSend(input: { userId: string; quoteId: string; to: string; token: "CELO" | "cUSD"; amount: string }) {
        if (input.userId.startsWith("wallet:")) {
            const w = await this.inner.getWalletOnly(input.userId);
            if (!w) throw new Error("agent_wallet_not_initialized");
        }
        // Execution always uses Turnkey (Agent Wallet) logic for now
        // Client-side signing happens via build-tx route which doesn't use this method
        return this.inner.executeSend(input);
    }

    async prepareSwap(input: PrepareSwapInput): Promise<PrepareSwapResult> {
        return this.inner.prepareSwap(input);
    }

    async executeSwap(input: { userId: string; quoteId: string; fromToken: "CELO" | "cUSD"; toToken: "CELO" | "cUSD"; amountIn: string; minAmountOut: string }) {
        if (input.userId.startsWith("wallet:")) {
            const w = await this.inner.getWalletOnly(input.userId);
            if (!w) throw new Error("agent_wallet_not_initialized");
        }
        return this.inner.executeSwap(input);
    }
}
