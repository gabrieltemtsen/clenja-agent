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
  provider: (process.env.OFFRAMP_PROVIDER || "legacy").toLowerCase() as "legacy" | "clova",
  apiBase: process.env.OFFRAMP_API_BASE || "",
  apiKey: process.env.OFFRAMP_API_KEY || "",
  authMode: (process.env.OFFRAMP_AUTH_MODE || "auto").toLowerCase() as "auto" | "api_key" | "x402",
  // Raw x402 payment header for backend-to-backend calls when api key is not used.
  // Expected format depends on upstream x402 provider (e.g. thirdweb settlePayment payload).
  x402PaymentHeader: process.env.OFFRAMP_X402_PAYMENT_HEADER || "",
  watcherToken: process.env.OFFRAMP_WATCHER_TOKEN || "",
  minConfirmations: Number(process.env.OFFRAMP_MIN_CONFIRMATIONS || 3),
  postConfirmWaitMs: Number(process.env.OFFRAMP_POST_CONFIRM_WAIT_MS || 90000),
  postConfirmPollMs: Number(process.env.OFFRAMP_POST_CONFIRM_POLL_MS || 5000),
  timeoutMs: Number(process.env.OFFRAMP_TIMEOUT_MS || 15000),
  fallbackToMockOnError: (process.env.OFFRAMP_FALLBACK_TO_MOCK_ON_ERROR || "true").toLowerCase() === "true",
  endpoints: {
    quote: process.env.OFFRAMP_EP_QUOTE || "/offramp/quote",
    create: process.env.OFFRAMP_EP_CREATE || "/offramp/create",
    status: process.env.OFFRAMP_EP_STATUS || "/offramp/status",
  },
  defaultBeneficiary: {
    country: process.env.CASHOUT_DEFAULT_COUNTRY || "NG",
    bankName: process.env.CASHOUT_DEFAULT_BANK_NAME || "",
    accountName: process.env.CASHOUT_DEFAULT_ACCOUNT_NAME || "",
    accountNumber: process.env.CASHOUT_DEFAULT_ACCOUNT_NUMBER || "",
    bankCode: process.env.CASHOUT_DEFAULT_BANK_CODE || "",
  },
};

export const safetyConfig = {
  strictLiveMode: (process.env.STRICT_LIVE_MODE || "false").toLowerCase() === "true",
};

export const walletConfig = {
  provider: (process.env.WALLET_PROVIDER || "para").toLowerCase() as "para" | "turnkey" | "goat" | "mock",
};

export const executionConfig = {
  engine: (process.env.EXECUTION_ENGINE || "legacy").toLowerCase() as "legacy" | "goat",
};

export const turnkeyConfig = {
  organizationId: process.env.TURNKEY_ORGANIZATION_ID || "",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY || "",
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY || "",
  celoRpcUrl: process.env.CELO_RPC_URL || "https://forno.celo.org",
};

export const llmConfig = {
  apiKey: process.env.OPENAI_API_KEY || "",
  model: process.env.CLENJA_LLM_MODEL || "gpt-4o-mini",
  enabled: (process.env.CLENJA_LLM_INTENT_ENABLED || "true").toLowerCase() === "true",
  timeoutMs: Number(process.env.CLENJA_LLM_TIMEOUT_MS || 6000),
};
