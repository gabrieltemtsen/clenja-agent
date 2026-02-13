export const pricing = {
  walletBalance: process.env.PRICE_WALLET_BALANCE || "$0.001",
  walletSendPrepare: process.env.PRICE_WALLET_SEND_PREPARE || "$0.002",
  walletSendConfirm: process.env.PRICE_WALLET_SEND_CONFIRM || "$0.002",
  offrampQuote: process.env.PRICE_OFFRAMP_QUOTE || "$0.005",
  offrampCreate: process.env.PRICE_OFFRAMP_CREATE || "$0.01",
};

export const paraConfig = {
  mode: (process.env.PARA_MODE || "mock").toLowerCase(),
  apiBase: process.env.PARA_API_BASE || "",
  apiKey: process.env.PARA_API_KEY || "",
  timeoutMs: Number(process.env.PARA_TIMEOUT_MS || 12000),
  fallbackToMockOnError: (process.env.PARA_FALLBACK_TO_MOCK_ON_ERROR || "true").toLowerCase() === "true",
  endpoints: {
    createOrLink: process.env.PARA_EP_CREATE_OR_LINK || "/wallet/create-or-link",
    balance: process.env.PARA_EP_BALANCE || "/wallet/balance",
    sendPrepare: process.env.PARA_EP_SEND_PREPARE || "/wallet/send/prepare",
    sendExecute: process.env.PARA_EP_SEND_EXECUTE || "/wallet/send/execute",
  }
};
