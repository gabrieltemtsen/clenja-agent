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
  if (msg.includes("offramp_payment_required_402")) {
    return `${label} requires payment authorization (x402 or API key) before this request can run.`;
  }
  if (msg.includes("offramp_auth_not_configured")) {
    return `${label} auth is not configured. Set API key or x402 payment header.`;
  }
  if (msg.includes("cashout_token_not_supported_live:CELO")) {
    return `${label} currently supports cUSD cashout for NGN. Please swap CELO to cUSD first.`;
  }
  if (msg.includes("offramp_beneficiary_missing_for_clova")) {
    return `${label} beneficiary details are incomplete. Configure default NG beneficiary or provide full bank details.`;
  }
  if (msg.includes("offramp_quote_not_found_or_expired")) {
    return `${label} quote expired. Please request a fresh cashout quote and confirm again.`;
  }
  if (msg.includes("rpc_-32602")) {
    return `${label} rejected the transaction format. Please retry; if it persists, check wallet signing config.`;
  }
  if (msg.includes("swap_allowance_tx_reverted")) {
    return `${label} could not set swap allowance onchain. Please retry; if it persists, refresh quote and try again.`;
  }
  if (msg.toLowerCase().includes("revert") || msg.toLowerCase().includes("rpc_-32000")) {
    return `${label} transaction reverted onchain. Please retry with a smaller amount or refresh quote.`;
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
