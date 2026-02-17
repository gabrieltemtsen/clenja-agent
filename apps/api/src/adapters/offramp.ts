import { randomUUID } from "node:crypto";
import type { CashoutQuoteRequest, CashoutQuoteResponse, CreatePayoutRequest } from "../lib/types.js";
import { offrampConfig, safetyConfig } from "../lib/config.js";

export interface OfframpProvider {
  quote(input: CashoutQuoteRequest): Promise<CashoutQuoteResponse>;
  create(input: CreatePayoutRequest): Promise<{ payoutId: string; status: "pending" | "processing" | "settled"; depositAddress?: string; receiveAmount?: string }>;
  status(payoutId: string): Promise<{ payoutId: string; status: string; updatedAt?: number }>;
  listBanks(country?: string): Promise<Array<{ name: string; code: string }>>;
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
  if (offrampConfig.mode !== "live") return;
  if (!offrampConfig.apiBase && safetyConfig.strictLiveMode) throw new Error("offramp_live_strict_config_missing");
}

function authHeaders(): Record<string, string> {
  const mode = offrampConfig.authMode;
  const hasApiKey = Boolean(offrampConfig.apiKey);
  const hasX402 = Boolean(offrampConfig.x402PaymentHeader);

  if (mode === "api_key") {
    if (!hasApiKey) throw new Error("offramp_auth_not_configured");
    return { "x-api-key": offrampConfig.apiKey };
  }

  if (mode === "x402") {
    if (!hasX402) throw new Error("offramp_auth_not_configured");
    return { "x-payment": offrampConfig.x402PaymentHeader };
  }

  // auto
  if (hasApiKey) return { "x-api-key": offrampConfig.apiKey };
  if (hasX402) return { "x-payment": offrampConfig.x402PaymentHeader };
  throw new Error("offramp_auth_not_configured");
}

async function offrampRequest(path: string, method: "POST" | "GET", body?: unknown) {
  if (!offrampConfig.apiBase) throw new Error("offramp_not_configured");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), offrampConfig.timeoutMs);

  try {
    const r = await fetch(`${offrampConfig.apiBase}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...authHeaders(),
      },
      body: method === "POST" ? JSON.stringify(body || {}) : undefined,
      signal: ctrl.signal,
    });

    if (!r.ok) {
      if (r.status === 402) throw new Error("offramp_payment_required_402");
      throw new Error(`offramp_http_${r.status}`);
    }
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

const clovaQuoteCache = new Map<string, { amountCrypto: string; asset: "cUSD_CELO" | "USDC_BASE" | "USDCX_STACKS"; createdAt: number }>();

function mapTokenToAsset(token: "cUSD" | "CELO") {
  if (token === "cUSD") return "cUSD_CELO" as const;
  // Keep explicit UX: CELO direct cashout not supported yet in clova path.
  throw new Error("cashout_token_not_supported_live:CELO");
}

function mapOrderStatus(status: string): "pending" | "processing" | "settled" {
  if (status === "paid_out") return "processing";
  if (status === "confirming") return "processing";
  if (status === "awaiting_deposit") return "pending";
  if (status === "failed") return "pending";
  return "processing";
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

  async status(payoutId: string) {
    return { payoutId, status: "pending", updatedAt: Date.now() };
  }

  async listBanks(_country?: string) {
    return [
      { name: "Access Bank", code: "044" },
      { name: "Guaranty Trust Bank", code: "058" },
      { name: "United Bank For Africa", code: "033" },
      { name: "Zenith Bank", code: "057" },
      { name: "First Bank of Nigeria", code: "011" },
    ];
  }
}

export class LiveOfframpProvider implements OfframpProvider {
  private fallback = new MockOfframpProvider();

  async quote(input: CashoutQuoteRequest): Promise<CashoutQuoteResponse> {
    assertLiveConfig();
    if (offrampConfig.mode !== "live") return this.fallback.quote(input);

    if (offrampConfig.provider === "clova") {
      const asset = mapTokenToAsset(input.fromToken);
      const data = await offrampRequest("/v1/quotes", "POST", {
        asset,
        amountCrypto: input.amount,
        destinationCurrency: "NGN",
      });

      const quoteId = String(data.quoteId || `cq_${randomUUID()}`);
      clovaQuoteCache.set(quoteId, {
        amountCrypto: input.amount,
        asset,
        createdAt: Date.now(),
      });

      return {
        quoteId,
        rate: String(data.rate || "0"),
        fee: String(data.feeNgn || data.fee || "0"),
        receiveAmount: String(data.receiveNgn || data.receiveAmount || "0"),
        eta: "Paystack payout after deposit confirmation",
        expiresAt: Number(data.expiresAt || Date.now() + 5 * 60 * 1000),
      };
    }

    try {
      const data = await offrampRequest(offrampConfig.endpoints.quote, "POST", input);
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

    if (offrampConfig.provider === "clova") {
      const cached = clovaQuoteCache.get(input.quoteId);
      if (!cached) throw new Error("offramp_quote_not_found_or_expired");

      const beneficiary = input.beneficiary;
      const bankCode = (beneficiary as any)?.bankCode || offrampConfig.defaultBeneficiary.bankCode;
      if (!beneficiary?.accountName || !beneficiary?.accountNumber || !bankCode) {
        throw new Error("offramp_beneficiary_missing_for_clova");
      }

      const data = await offrampRequest("/v1/orders", "POST", {
        asset: cached.asset,
        amountCrypto: cached.amountCrypto,
        recipient: {
          accountName: beneficiary.accountName,
          accountNumber: beneficiary.accountNumber,
          bankCode,
        },
      });

      clovaQuoteCache.delete(input.quoteId);
      return {
        payoutId: String(data.orderId || `ord_${randomUUID()}`),
        status: mapOrderStatus(String(data.status || "awaiting_deposit")),
        depositAddress: String(data.depositAddress || ""),
        receiveAmount: String(data.receiveNgn || ""),
      };
    }

    try {
      const data = await offrampRequest(offrampConfig.endpoints.create, "POST", input);
      return {
        payoutId: String(data.payoutId || `po_${randomUUID()}`),
        status: (data.status || "pending") as "pending" | "processing" | "settled",
      };
    } catch (e) {
      if (!offrampConfig.fallbackToMockOnError) throw e;
      return this.fallback.create(input);
    }
  }

  async status(payoutId: string) {
    assertLiveConfig();
    if (offrampConfig.mode !== "live") return this.fallback.status(payoutId);

    if (offrampConfig.provider === "clova") {
      const data = await offrampRequest(`/v1/orders/${encodeURIComponent(payoutId)}`, "GET");
      return {
        payoutId,
        status: String(data.status || "unknown"),
        updatedAt: Number(data.updatedAt || Date.now()),
      };
    }

    const data = await offrampRequest(`${offrampConfig.endpoints.status}/${encodeURIComponent(payoutId)}`, "GET");
    return {
      payoutId,
      status: String(data.status || "unknown"),
      updatedAt: Number(data.updatedAt || Date.now()),
    };
  }

  async listBanks(country = "nigeria") {
    assertLiveConfig();
    if (offrampConfig.mode !== "live") return this.fallback.listBanks(country);

    if (offrampConfig.provider === "clova") {
      const data = await offrampRequest(`/v1/banks?country=${encodeURIComponent(country)}`, "GET");
      return Array.isArray(data?.banks) ? data.banks : [];
    }

    // Legacy provider has no bank discovery route yet.
    return this.fallback.listBanks(country);
  }
}
