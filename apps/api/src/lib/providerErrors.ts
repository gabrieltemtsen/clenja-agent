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
  return `${label} request failed. Please retry.`;
}
