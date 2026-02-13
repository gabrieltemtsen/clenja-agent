export type Intent =
  | { kind: "balance" }
  | { kind: "history" }
  | { kind: "status" }
  | { kind: "send"; amount: string; token: "cUSD" | "CELO"; to: string }
  | { kind: "cashout"; amount: string; token: "cUSD" | "CELO"; beneficiaryName?: string }
  | { kind: "unknown"; raw: string };

const sendRegex = /send\s+(\d+(?:\.\d+)?)\s+(cusd|celo)\s+to\s+([^\s]+)/i;
const cashoutRegex = /cashout\s+(\d+(?:\.\d+)?)\s+(cusd|celo)(?:\s+to\s+(.+))?/i;

function normalizeToken(token: string): "cUSD" | "CELO" {
  return token.toLowerCase() === "cusd" ? "cUSD" : "CELO";
}

export function parseIntent(text: string): Intent {
  const t = text.trim();
  if (/balance|what'?s my balance|my balance/i.test(t)) return { kind: "balance" };
  if (/history|my transactions|receipts/i.test(t)) return { kind: "history" };
  if (/status|system status|readiness/i.test(t)) return { kind: "status" };

  const s = t.match(sendRegex);
  if (s) {
    return { kind: "send", amount: s[1], token: normalizeToken(s[2]), to: s[3] };
  }

  const c = t.match(cashoutRegex);
  if (c) {
    return { kind: "cashout", amount: c[1], token: normalizeToken(c[2]), beneficiaryName: c[3]?.trim() };
  }

  return { kind: "unknown", raw: t };
}
