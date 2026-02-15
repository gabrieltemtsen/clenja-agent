export type Intent =
  | { kind: "balance" }
  | { kind: "history" }
  | { kind: "status" }
  | { kind: "help" }
  | { kind: "address" }
  | { kind: "sendability_check" }
  | { kind: "send"; amount: string; token: "cUSD" | "CELO"; to: string }
  | { kind: "cashout"; amount: string; token: "cUSD" | "CELO"; beneficiaryName?: string }
  | { kind: "unknown"; raw: string };

const sendRegex = /(send|transfer)\s+(\d+(?:\.\d+)?)\s*(cusd|celo)\s+(?:to\s+)?(?:this\s+address\s*:?\s*)?(0x[a-fA-F0-9]{40})/i;
const cashoutRegex = /cashout\s+(\d+(?:\.\d+)?)\s+(cusd|celo)(?:\s+to\s+(.+))?/i;

function normalizeToken(token: string): "cUSD" | "CELO" {
  return token.toLowerCase() === "cusd" ? "cUSD" : "CELO";
}

export function parseIntent(text: string): Intent {
  const t = text.trim();
  const c = t.replace(/\s+/g, " ");
  if (/help|what can you do|commands/i.test(c)) return { kind: "help" };
  if (/balance|what'?s my balance|my balance/i.test(c)) return { kind: "balance" };
  if (/history|my transactions|receipts/i.test(c)) return { kind: "history" };
  if (/status|system status|readiness/i.test(c)) return { kind: "status" };

  const s = c.match(sendRegex);
  if (s) {
    return { kind: "send", amount: s[2], token: normalizeToken(s[3]), to: s[4] };
  }

  if (/address|wallet address|my address/i.test(c)) return { kind: "address" };
  if (/do i have enough celo|enough celo to send|can i send/i.test(c)) return { kind: "sendability_check" };

  const co = c.match(cashoutRegex);
  if (co) {
    return { kind: "cashout", amount: co[1], token: normalizeToken(co[2]), beneficiaryName: co[3]?.trim() };
  }

  return { kind: "unknown", raw: t };
}
