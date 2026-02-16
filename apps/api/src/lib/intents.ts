export type Intent =
  | { kind: "balance" }
  | { kind: "history" }
  | { kind: "status" }
  | { kind: "help" }
  | { kind: "address" }
  | { kind: "greeting" }
  | { kind: "sendability_check" }
  | { kind: "list_recipients" }
  | { kind: "save_recipient"; name: string; address: string }
  | { kind: "delete_recipient"; name: string }
  | { kind: "update_recipient"; name: string; address: string }
  | { kind: "confirm_yes" }
  | { kind: "show_limits" }
  | { kind: "set_daily_limit"; amount: string }
  | { kind: "set_per_tx_limit"; amount: string }
  | { kind: "pause_sending" }
  | { kind: "resume_sending" }
  | { kind: "send"; amount: string; token: "cUSD" | "CELO"; to: string }
  | { kind: "send_to_recipient"; amount: string; token: "cUSD" | "CELO"; recipientName: string }
  | { kind: "cashout"; amount: string; token: "cUSD" | "CELO"; beneficiaryName?: string }
  | { kind: "unknown"; raw: string };

const sendRegex = /(send|transfer)\s+(\d+(?:\.\d+)?)\s*(cusd|celo)\s+(?:to\s+)?(?:this\s+address\s*:?\s*)?(0x[a-fA-F0-9]{40})/i;
const sendToNameRegex = /(send|transfer)\s+(\d+(?:\.\d+)?)\s*(cusd|celo)\s+to\s+([a-zA-Z][a-zA-Z0-9 _-]{1,40})/i;
const saveRecipientRegex = /(?:save\s+recipient|save\s+beneficiary)\s+([a-zA-Z][a-zA-Z0-9 _-]{1,40})\s+(0x[a-fA-F0-9]{40})/i;
const updateRecipientRegex = /(?:update\s+recipient|update\s+beneficiary)\s+([a-zA-Z][a-zA-Z0-9 _-]{1,40})\s+(0x[a-fA-F0-9]{40})/i;
const deleteRecipientRegex = /(?:delete|remove)\s+(?:recipient|beneficiary)\s+([a-zA-Z][a-zA-Z0-9 _-]{1,40})/i;
const setDailyLimitRegex = /set\s+daily\s+limit\s+(\d+(?:\.\d+)?)/i;
const setPerTxLimitRegex = /set\s+(?:per[- ]?tx|transaction)\s+limit\s+(\d+(?:\.\d+)?)/i;
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
  if (/^(hi|hello|hey)\b/i.test(c) || /how are you/i.test(c)) return { kind: "greeting" };
  if (/^(yes|confirm|ok)$/i.test(c)) return { kind: "confirm_yes" };
  if (/show limits|my limits|limits/i.test(c)) return { kind: "show_limits" };
  if (/pause sending|pause transfers|stop sending/i.test(c)) return { kind: "pause_sending" };
  if (/resume sending|resume transfers|enable sending/i.test(c)) return { kind: "resume_sending" };
  if (/list recipients|list beneficiaries|my recipients|saved recipients/i.test(c)) return { kind: "list_recipients" };

  const dl = c.match(setDailyLimitRegex);
  if (dl) return { kind: "set_daily_limit", amount: dl[1] };
  const ptl = c.match(setPerTxLimitRegex);
  if (ptl) return { kind: "set_per_tx_limit", amount: ptl[1] };

  const sv = c.match(saveRecipientRegex);
  if (sv) {
    return { kind: "save_recipient", name: sv[1].trim(), address: sv[2] };
  }
  const uv = c.match(updateRecipientRegex);
  if (uv) {
    return { kind: "update_recipient", name: uv[1].trim(), address: uv[2] };
  }
  const dv = c.match(deleteRecipientRegex);
  if (dv) {
    return { kind: "delete_recipient", name: dv[1].trim() };
  }

  const s = c.match(sendRegex);
  if (s) {
    return { kind: "send", amount: s[2], token: normalizeToken(s[3]), to: s[4] };
  }

  const sn = c.match(sendToNameRegex);
  if (sn) {
    return { kind: "send_to_recipient", amount: sn[2], token: normalizeToken(sn[3]), recipientName: sn[4].trim() };
  }

  if (/address|wallet address|my address/i.test(c)) return { kind: "address" };
  if (/do i have enough celo|enough celo to send|can i send/i.test(c)) return { kind: "sendability_check" };

  const co = c.match(cashoutRegex);
  if (co) {
    return { kind: "cashout", amount: co[1], token: normalizeToken(co[2]), beneficiaryName: co[3]?.trim() };
  }

  return { kind: "unknown", raw: t };
}
