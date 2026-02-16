export type WalletBalance = {
  walletAddress: string;
  chain: "celo";
  balances: Array<{ token: "CELO" | "cUSD"; amount: string; usd: string }>;
};

export type PrepareSendInput = {
  fromUserId: string;
  token: "CELO" | "cUSD";
  amount: string;
  to: string;
};

export type PrepareSendResult = {
  quoteId: string;
  networkFee: string;
  estimatedArrival: string;
};

export type PrepareSwapInput = {
  fromUserId: string;
  fromToken: "CELO" | "cUSD";
  toToken: "CELO" | "cUSD";
  amountIn: string;
  slippageBps?: number;
};

export type PrepareSwapResult = {
  quoteId: string;
  amountOut: string;
  minAmountOut: string;
  route: string;
};

export interface WalletProvider {
  createOrLinkUserWallet(userId: string): Promise<{ walletAddress: string }>;
  getBalance(userId: string): Promise<WalletBalance>;
  prepareSend(input: PrepareSendInput): Promise<PrepareSendResult>;
  executeSend(input: { userId: string; quoteId: string; to: string; token: "CELO" | "cUSD"; amount: string }): Promise<{ txHash: string; status: "submitted" | "confirmed" }>;
  prepareSwap(input: PrepareSwapInput): Promise<PrepareSwapResult>;
  executeSwap(input: { userId: string; quoteId: string; fromToken: "CELO" | "cUSD"; toToken: "CELO" | "cUSD"; amountIn: string; minAmountOut: string }): Promise<{ txHash: string; status: "submitted" | "confirmed" }>;
}
