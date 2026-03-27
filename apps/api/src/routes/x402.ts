import { Router } from "express";
import { requireX402 } from "../middleware/x402.js";
import { pricing, routeDescriptions } from "../lib/config.js";

export const x402Router = Router();

/**
 * GET /v1/x402/pricing
 * Public endpoint — returns the full x402 pricing table.
 * Useful for devs / agents to discover costs before calling paid endpoints.
 */
x402Router.get("/pricing", (_req, res) => {
    return res.json({
        description: "CLENJA x402 pricing table (USD per call)",
        network: process.env.X402_NETWORK || "celo",
        serverWallet: process.env.X402_SERVER_WALLET || "not_configured",
        endpoints: Object.entries(pricing).map(([key, price]) => ({
            key,
            price,
            description: routeDescriptions[key] || key,
        })),
    });
});

/**
 * GET /v1/x402/test
 * Payment-gated endpoint — proves the full 402 → payment → 200 flow.
 * Without a valid x-payment header, returns HTTP 402 with payment instructions.
 * With a valid payment, returns 200 with receipt proof.
 */
x402Router.get(
    "/test",
    requireX402(pricing.x402Test, { description: routeDescriptions.x402Test }),
    (_req, res) => {
        return res.json({
            status: "paid",
            message: "x402 payment verified successfully ✅",
            service: "@clenja/api",
            network: process.env.X402_NETWORK || "celo",
            paymentReceiptId: res.getHeader("x-payment-receipt-id") || null,
            paidAt: new Date().toISOString(),
        });
    },
);
