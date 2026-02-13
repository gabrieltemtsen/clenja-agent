import { randomUUID } from "node:crypto";
import type { CashoutQuoteRequest, CashoutQuoteResponse, CreatePayoutRequest } from "../lib/types.js";

export interface OfframpProvider {
  quote(input: CashoutQuoteRequest): Promise<CashoutQuoteResponse>;
  create(input: CreatePayoutRequest): Promise<{ payoutId: string; status: "pending" | "processing" | "settled" }>;
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
