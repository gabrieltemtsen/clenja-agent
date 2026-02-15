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
              "Extract user intent for a crypto assistant. Return strict JSON with keys: kind, amount, token, to, beneficiaryName, assistantReply. Allowed kind: help,balance,history,status,address,sendability_check,send,cashout,unknown. For token use CELO or cUSD. For unknown, provide short helpful assistantReply.",
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

    if (["help", "balance", "history", "status", "address", "greeting", "sendability_check"].includes(k)) {
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
