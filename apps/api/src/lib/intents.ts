export type Intent =
  | { kind: "balance" }
  | { kind: "send"; amount: string; token: "cUSD" | "CELO"; to: string }
  | { kind: "cashout"; amount: string; token: "cUSD" | "CELO" }
  | { kind: "unknown"; raw: string };

const sendRegex = /send\s+(\d+(?:\.\d+)?)\s+(cusd|celo)\s+to\s+([^\s]+)/i;
const cashoutRegex = /cashout\s+(\d+(?:\.\d+)?)\s+(cusd|celo)/i;

export function parseIntent(text: string): Intent {
  const t = text.trim();
  if (/balance|what'?s my balance|my balance/i.test(t)) return { kind: "balance" };

  const s = t.match(sendRegex);
  if (s) {
    return { kind: "send", amount: s[1], token: s[2].toUpperCase() as "cUSD" | "CELO", to: s[3] };
  }

  const c = t.match(cashoutRegex);
  if (c) {
    return { kind: "cashout", amount: c[1], token: c[2].toUpperCase() as "cUSD" | "CELO" };
  }

  return { kind: "unknown", raw: t };
}
