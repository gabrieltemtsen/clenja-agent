export function toUserFacingProviderError(err: unknown, provider: "para" | "offramp") {
  const msg = String((err as any)?.message || err || "unknown_error");

  if (msg.includes("timeout")) {
    return `${provider.toUpperCase()} is taking too long right now. Please retry in a moment.`;
  }
  if (msg.includes("not_configured") || msg.includes("strict_config_missing")) {
    return `${provider.toUpperCase()} live mode is not fully configured.`;
  }
  if (msg.includes("http_401") || msg.includes("http_403")) {
    return `${provider.toUpperCase()} credentials were rejected.`;
  }
  return `${provider.toUpperCase()} request failed. Please retry.`;
}
