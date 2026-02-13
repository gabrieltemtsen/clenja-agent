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
};
