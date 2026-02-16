export function toUserFacingProviderError(err: unknown, provider: "para" | "offramp" | "wallet") {
  const msg = String((err as any)?.message || err || "unknown_error");
  const label = provider === "wallet" ? "Wallet" : provider.toUpperCase();

  if (msg.includes("timeout")) {
    return `${label} is taking too long right now. Please retry in a moment.`;
  }
  if (msg.includes("not_configured") || msg.includes("strict_config_missing")) {
    return `${label} live mode is not fully configured.`;
  }
  if (msg.includes("http_401") || msg.includes("http_403")) {
    return `${label} credentials were rejected.`;
  }
  if (msg.includes("rpc_-32602")) {
    return `${label} rejected the transaction format. Please retry; if it persists, check wallet signing config.`;
  }
  if (msg.includes("swap_quote_expired")) {
    return `${label} swap quote expired. Please request a new swap quote.`;
  }
  if (msg.includes("goat_turnkey_sign") || msg.includes("turnkey_sign_failed")) {
    return `${label} signing failed. Please retry in a few seconds.`;
  }
  if (msg.includes("mento_sdk_unavailable")) {
    return `${label} swap engine is unavailable right now. Please retry shortly.`;
  }
  return `${label} request failed. Please retry.`;
}
