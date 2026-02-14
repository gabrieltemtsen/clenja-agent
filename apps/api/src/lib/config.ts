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

export const offrampConfig = {
  mode: (process.env.OFFRAMP_MODE || "mock").toLowerCase(),
  apiBase: process.env.OFFRAMP_API_BASE || "",
  apiKey: process.env.OFFRAMP_API_KEY || "",
  timeoutMs: Number(process.env.OFFRAMP_TIMEOUT_MS || 15000),
  fallbackToMockOnError: (process.env.OFFRAMP_FALLBACK_TO_MOCK_ON_ERROR || "true").toLowerCase() === "true",
  endpoints: {
    quote: process.env.OFFRAMP_EP_QUOTE || "/offramp/quote",
    create: process.env.OFFRAMP_EP_CREATE || "/offramp/create",
    status: process.env.OFFRAMP_EP_STATUS || "/offramp/status",
  }
};

export const safetyConfig = {
  strictLiveMode: (process.env.STRICT_LIVE_MODE || "false").toLowerCase() === "true",
};

export const walletConfig = {
  provider: (process.env.WALLET_PROVIDER || "para").toLowerCase() as "para" | "turnkey" | "mock",
};

export const turnkeyConfig = {
  organizationId: process.env.TURNKEY_ORGANIZATION_ID || "",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY || "",
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY || "",
  celoRpcUrl: process.env.CELO_RPC_URL || "https://forno.celo.org",
};
