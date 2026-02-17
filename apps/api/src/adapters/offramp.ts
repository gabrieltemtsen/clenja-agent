import { randomUUID } from "node:crypto";
import type { CashoutQuoteRequest, CashoutQuoteResponse, CreatePayoutRequest } from "../lib/types.js";
import { offrampConfig, safetyConfig } from "../lib/config.js";

export interface OfframpProvider {
  quote(input: CashoutQuoteRequest): Promise<CashoutQuoteResponse>;
  create(input: CreatePayoutRequest): Promise<{ payoutId: string; status: "pending" | "processing" | "settled"; depositAddress?: string; receiveAmount?: string; currency?: string }>;
}

type OfframpLiveStatus = { mode: "mock" | "live"; healthy: boolean; auth: "api_key" | "x402" | "none"; lastError?: string; lastCheckedAt?: number };
let liveStatus: OfframpLiveStatus = {
  mode: offrampConfig.mode === "live" ? "live" : "mock",
  healthy: offrampConfig.mode !== "live",
  auth: "none",
};

function setLiveStatus(ok: boolean, auth: OfframpLiveStatus["auth"], err?: string) {
  liveStatus = { mode: offrampConfig.mode === "live" ? "live" : "mock", healthy: ok, auth, lastError: err, lastCheckedAt: Date.now() };
}

export function getOfframpLiveStatus() {
  return liveStatus;
}

function chosenAuthMode(): "api_key" | "x402" | "none" {
  const hasApiKey = Boolean(offrampConfig.apiKey);
  const hasX402 = Boolean(offrampConfig.x402PaymentHeader);
  if (offrampConfig.authMode === "api_key") return hasApiKey ? "api_key" : "none";
  if (offrampConfig.authMode === "x402") return hasX402 ? "x402" : "none";
  if (hasApiKey) return "api_key";
  if (hasX402) return "x402";
  return "none";
}

function assertLiveConfig() {
  const auth = chosenAuthMode();
  if (offrampConfig.mode === "live" && (!offrampConfig.apiBase || auth === "none") && safetyConfig.strictLiveMode) {
    throw new Error("offramp_live_strict_config_missing");
  }
}

function tokenToClovaAsset(fromToken: "cUSD" | "CELO") {
  if (fromToken === "cUSD") return "cUSD_CELO" as const;
  // Clova currently offramps stablecoins; CELO should be swapped first.
  throw new Error("cashout_token_not_supported_live:CELO");
}

async function offrampRequest(path: string, body: unknown) {
  const auth = chosenAuthMode();
  if (!offrampConfig.apiBase) throw new Error("offramp_not_configured");
  if (auth === "none") throw new Error("offramp_auth_not_configured");

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth === "api_key") {
    headers["x-api-key"] = offrampConfig.apiKey;
    headers["authorization"] = `Bearer ${offrampConfig.apiKey}`;
  } else if (auth === "x402") {
    headers["x-payment"] = offrampConfig.x402PaymentHeader;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), offrampConfig.timeoutMs);

  try {
    const r = await fetch(`${offrampConfig.apiBase}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 402) throw new Error("offramp_payment_required_402");
      throw new Error(`offramp_http_${r.status}`);
    }

    setLiveStatus(true, auth);
    return data;
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "offramp_timeout" : String(e?.message || e);
    setLiveStatus(false, auth, msg);
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
      if (offrampConfig.provider === "clova") {
        const asset = tokenToClovaAsset(input.fromToken);
        const data = await offrampRequest("/v1/quotes", {
          asset,
          amountCrypto: input.amount,
          destinationCurrency: input.currency,
        });

        return {
          quoteId: String(data.quoteId || `oq_${randomUUID()}`),
          rate: String(data.rate || "0"),
          fee: String(data.feeNgn || data.fee || "0"),
          receiveAmount: String(data.receiveNgn || data.receiveAmount || "0"),
          eta: "3-15 min",
        };
      }

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
      if (offrampConfig.provider === "clova") {
        const asset = tokenToClovaAsset(input.fromToken || "cUSD");
        const fallback = offrampConfig.defaultBeneficiary;
        const accountName = input.beneficiary.accountName || fallback.accountName;
        const accountNumber = input.beneficiary.accountNumber || fallback.accountNumber;
        const bankCode = (input as any).beneficiary.bankCode || fallback.bankCode;

        if (!accountName || !accountNumber || !bankCode) {
          throw new Error("offramp_beneficiary_missing_for_clova");
        }

        const data = await offrampRequest("/v1/orders", {
          asset,
          amountCrypto: input.amount,
          recipient: {
            accountName,
            accountNumber,
            bankCode,
          },
        });

        return {
          payoutId: String(data.orderId || `ord_${randomUUID()}`),
          status: "processing" as const,
          depositAddress: String(data.depositAddress || ""),
          receiveAmount: String(data.receiveNgn || ""),
          currency: "NGN",
        };
      }

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
