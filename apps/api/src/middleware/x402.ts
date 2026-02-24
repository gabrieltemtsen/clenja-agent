import type { Request, Response, NextFunction } from "express";
import { createThirdwebClient } from "thirdweb";
import { celo, celoSepoliaTestnet } from "thirdweb/chains";
import { facilitator, settlePayment } from "thirdweb/x402";
import { store } from "../lib/store.js";

const secretKey = process.env.THIRDWEB_SECRET_KEY;
const serverWalletAddress = process.env.X402_SERVER_WALLET;
const networkName = (process.env.X402_NETWORK || "celo").toLowerCase();

const network = networkName === "celo-sepolia" ? celoSepoliaTestnet : celo;

const canSettle = Boolean(secretKey && serverWalletAddress);

const x402Facilitator = canSettle
  ? facilitator({
    client: createThirdwebClient({ secretKey: secretKey! }),
    serverWalletAddress: serverWalletAddress!,
  })
  : null;

interface X402Options {
  description?: string;
  maxTimeoutSeconds?: number;
}

export function requireX402(price: string, opts?: X402Options) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const paymentData = req.header("payment-signature") || req.header("x-payment") || undefined;

    if (!canSettle || !x402Facilitator) {
      return res.status(503).json({
        error: "x402_not_configured",
        hint: "Set THIRDWEB_SECRET_KEY and X402_SERVER_WALLET in env",
      });
    }

    const resourceUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    try {
      const result = await settlePayment({
        resourceUrl,
        method: req.method,
        paymentData,
        payTo: serverWalletAddress!,
        network,
        price,
        facilitator: x402Facilitator,
        routeConfig: {
          description: opts?.description || "CLENJA paid API endpoint",
          mimeType: "application/json",
          ...(opts?.maxTimeoutSeconds ? { maxTimeoutSeconds: opts.maxTimeoutSeconds } : {}),
        },
      });

      if (result.status !== 200) {
        Object.entries(result.responseHeaders).forEach(([k, v]) => res.setHeader(k, String(v)));

        store.addAudit({
          id: `aud_${Date.now()}`,
          ts: Date.now(),
          action: "x402.settle",
          status: "error",
          detail: { resourceUrl, price, httpStatus: result.status },
        });

        return res.status(result.status).json(result.responseBody);
      }

      Object.entries(result.responseHeaders).forEach(([k, v]) => res.setHeader(k, String(v)));
      const receiptHeader = result.responseHeaders["x-payment-response"] || result.responseHeaders["x-payment-receipt-id"];
      if (receiptHeader) res.setHeader("x-payment-receipt-id", String(receiptHeader));

      store.addAudit({
        id: `aud_${Date.now()}`,
        ts: Date.now(),
        action: "x402.settle",
        status: "ok",
        detail: {
          resourceUrl,
          price,
          receiptId: receiptHeader ? String(receiptHeader) : undefined,
        },
      });

      next();
    } catch (err: any) {
      console.error("[x402] settlePayment error:", err?.message || err);

      store.addAudit({
        id: `aud_${Date.now()}`,
        ts: Date.now(),
        action: "x402.settle",
        status: "error",
        detail: {
          resourceUrl,
          price,
          error: String(err?.message || err),
        },
      });

      return res.status(502).json({
        error: "x402_settlement_error",
        message: "Payment settlement failed. Please retry.",
      });
    }
  };
}
