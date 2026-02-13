import { randomUUID } from "node:crypto";
import type { CashoutQuoteRequest, CashoutQuoteResponse, CreatePayoutRequest } from "../lib/types.js";
import { offrampConfig, safetyConfig } from "../lib/config.js";

export interface OfframpProvider {
  quote(input: CashoutQuoteRequest): Promise<CashoutQuoteResponse>;
  create(input: CreatePayoutRequest): Promise<{ payoutId: string; status: "pending" | "processing" | "settled" }>;
}

type OfframpLiveStatus = { mode: "mock" | "live"; healthy: boolean; lastError?: string; lastCheckedAt?: number };
let liveStatus: OfframpLiveStatus = { mode: offrampConfig.mode === "live" ? "live" : "mock", healthy: offrampConfig.mode !== "live" };

function setLiveStatus(ok: boolean, err?: string) {
  liveStatus = { mode: offrampConfig.mode === "live" ? "live" : "mock", healthy: ok, lastError: err, lastCheckedAt: Date.now() };
}

export function getOfframpLiveStatus() {
  return liveStatus;
}

function assertLiveConfig() {
  if (offrampConfig.mode === "live" && (!offrampConfig.apiBase || !offrampConfig.apiKey) && safetyConfig.strictLiveMode) {
    throw new Error("offramp_live_strict_config_missing");
  }
}

async function offrampRequest(path: string, body: unknown) {
  if (!offrampConfig.apiBase || !offrampConfig.apiKey) throw new Error("offramp_not_configured");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), offrampConfig.timeoutMs);

  try {
    const r = await fetch(`${offrampConfig.apiBase}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${offrampConfig.apiKey}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`offramp_http_${r.status}`);
    const data = await r.json();
    setLiveStatus(true);
    return data;
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "offramp_timeout" : String(e?.message || e);
    setLiveStatus(false, msg);
    throw new Error(msg);
  } finally {
    clearTimeout(timer);
  }
}

export class MockOfframpProvider implements OfframpProvider {
  async quote(input: CashoutQuoteRequest): Promise<CashoutQuoteResponse> {
    const amount = Number(input.amount);
    const fee = Math.max(0.5, amount * 0.02);
    const mockRateByCurrency: Record<string, number> = { NGN: 1520, KES: 128, GHS: 15.5, ZAR: 18.9 };
    const rate = mockRateByCurrency[input.currency] ?? 100;
    const receiveAmount = amount * rate - fee * rate;

    return {
      quoteId: `oq_${randomUUID()}`,
      rate: rate.toFixed(4),
      fee: fee.toFixed(2),
      receiveAmount: receiveAmount.toFixed(2),
      eta: "5-30 min"
    };
  }

  async create(_: CreatePayoutRequest) {
    return {
      payoutId: `po_${randomUUID()}`,
      status: "pending" as const
    };
  }
}

export class LiveOfframpProvider implements OfframpProvider {
  private fallback = new MockOfframpProvider();

  async quote(input: CashoutQuoteRequest): Promise<CashoutQuoteResponse> {
    assertLiveConfig();
    if (offrampConfig.mode !== "live") return this.fallback.quote(input);
    try {
      const data = await offrampRequest(offrampConfig.endpoints.quote, input);
      return {
        quoteId: String(data.quoteId || `oq_${randomUUID()}`),
        rate: String(data.rate || "0"),
        fee: String(data.fee || "0"),
        receiveAmount: String(data.receiveAmount || "0"),
        eta: String(data.eta || "5-30 min"),
      };
    } catch (e) {
      if (!offrampConfig.fallbackToMockOnError) throw e;
      return this.fallback.quote(input);
    }
  }

  async create(input: CreatePayoutRequest) {
    assertLiveConfig();
    if (offrampConfig.mode !== "live") return this.fallback.create(input);
    try {
      const data = await offrampRequest(offrampConfig.endpoints.create, input);
      return {
        payoutId: String(data.payoutId || `po_${randomUUID()}`),
        status: (data.status || "pending") as "pending" | "processing" | "settled",
      };
    } catch (e) {
      if (!offrampConfig.fallbackToMockOnError) throw e;
      return this.fallback.create(input);
    }
  }
}
