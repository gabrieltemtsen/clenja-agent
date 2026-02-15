import { parseIntent, type Intent } from "./intents.js";
import { llmConfig } from "./config.js";

type IntentRoute = { intent: Intent; assistantReply?: string; source: "regex" | "llm" };

function fallback(text: string): IntentRoute {
  return { intent: parseIntent(text), source: "regex" };
}

export async function routeIntent(text: string): Promise<IntentRoute> {
  const base = parseIntent(text);
  if (base.kind !== "unknown") return { intent: base, source: "regex" };
  if (!llmConfig.enabled || !llmConfig.apiKey) return fallback(text);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), llmConfig.timeoutMs);

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${llmConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: llmConfig.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Extract user intent for a crypto assistant. Return strict JSON with keys: kind, amount, token, to, beneficiaryName, recipientName, name, address, assistantReply. Allowed kind: help,balance,history,status,address,greeting,confirm_yes,show_limits,set_daily_limit,set_per_tx_limit,pause_sending,resume_sending,sendability_check,list_recipients,save_recipient,update_recipient,delete_recipient,send,send_to_recipient,cashout,unknown. For token use CELO or cUSD. For unknown, provide short helpful assistantReply.",
          },
          { role: "user", content: text },
        ],
      }),
    });

    if (!r.ok) return fallback(text);
    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return fallback(text);

    const parsed = JSON.parse(raw) as any;
    const k = String(parsed?.kind || "unknown");

    if (k === "send") {
      if (!parsed.amount || !parsed.token || !parsed.to) {
        return {
          intent: { kind: "unknown", raw: text },
          source: "llm",
          assistantReply: "Got it — I can send this. Please include amount, token (CELO/cUSD), and recipient address.",
        };
      }
      return {
        intent: {
          kind: "send",
          amount: String(parsed.amount),
          token: String(parsed.token).toLowerCase() === "cusd" ? "cUSD" : "CELO",
          to: String(parsed.to),
        },
        source: "llm",
      };
    }

    if (k === "cashout") {
      if (!parsed.amount || !parsed.token) {
        return {
          intent: { kind: "unknown", raw: text },
          source: "llm",
          assistantReply: "I can do that. Tell me the cashout amount and token (CELO or cUSD).",
        };
      }
      return {
        intent: {
          kind: "cashout",
          amount: String(parsed.amount),
          token: String(parsed.token).toLowerCase() === "cusd" ? "cUSD" : "CELO",
          beneficiaryName: parsed.beneficiaryName ? String(parsed.beneficiaryName) : undefined,
        },
        source: "llm",
      };
    }

    if (k === "save_recipient") {
      if (!parsed.name || !parsed.address) {
        return { intent: { kind: "unknown", raw: text }, source: "llm", assistantReply: "To save a recipient, send: save recipient <name> <0xaddress>." };
      }
      return { intent: { kind: "save_recipient", name: String(parsed.name), address: String(parsed.address) }, source: "llm" };
    }

    if (k === "update_recipient") {
      if (!parsed.name || !parsed.address) {
        return { intent: { kind: "unknown", raw: text }, source: "llm", assistantReply: "To update a recipient, send: update recipient <name> <0xaddress>." };
      }
      return { intent: { kind: "update_recipient", name: String(parsed.name), address: String(parsed.address) }, source: "llm" };
    }

    if (k === "delete_recipient") {
      if (!parsed.name) {
        return { intent: { kind: "unknown", raw: text }, source: "llm", assistantReply: "To delete a recipient, send: delete recipient <name>." };
      }
      return { intent: { kind: "delete_recipient", name: String(parsed.name) }, source: "llm" };
    }

    if (k === "send_to_recipient") {
      if (!parsed.amount || !parsed.token || !parsed.recipientName) {
        return { intent: { kind: "unknown", raw: text }, source: "llm", assistantReply: "Tell me amount, token, and recipient name (e.g., send 5 CELO to Gabriel)." };
      }
      return {
        intent: {
          kind: "send_to_recipient",
          amount: String(parsed.amount),
          token: String(parsed.token).toLowerCase() === "cusd" ? "cUSD" : "CELO",
          recipientName: String(parsed.recipientName),
        },
        source: "llm",
      };
    }

    if (k === "set_daily_limit") {
      if (!parsed.amount) return { intent: { kind: "unknown", raw: text }, source: "llm", assistantReply: "Tell me the daily limit amount, e.g. set daily limit 50." };
      return { intent: { kind: "set_daily_limit", amount: String(parsed.amount) }, source: "llm" };
    }

    if (k === "set_per_tx_limit") {
      if (!parsed.amount) return { intent: { kind: "unknown", raw: text }, source: "llm", assistantReply: "Tell me the per-transaction limit amount, e.g. set per-tx limit 20." };
      return { intent: { kind: "set_per_tx_limit", amount: String(parsed.amount) }, source: "llm" };
    }

    if (["help", "balance", "history", "status", "address", "greeting", "confirm_yes", "show_limits", "pause_sending", "resume_sending", "sendability_check", "list_recipients"].includes(k)) {
      return { intent: { kind: k as any }, source: "llm" };
    }

    return {
      intent: { kind: "unknown", raw: text },
      source: "llm",
      assistantReply: parsed?.assistantReply ? String(parsed.assistantReply) : undefined,
    };
  } catch {
    return fallback(text);
  } finally {
    clearTimeout(timer);
  }
}
