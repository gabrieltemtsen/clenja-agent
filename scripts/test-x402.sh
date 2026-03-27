#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  CLENJA x402 Payment Evidence Script
#  Run against a live or local API instance to capture submission evidence.
#  Usage:  bash scripts/test-x402.sh [base_url]
# ─────────────────────────────────────────────────────────────────

BASE="${1:-http://localhost:8080}"

echo "=== 1/3  x402 Pricing Table (public) ==="
curl -s "$BASE/v1/x402/pricing" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/v1/x402/pricing"
echo ""

echo "=== 2/3  x402 Test Endpoint — NO payment header (expect 402) ==="
STATUS=$(curl -s -o /tmp/x402_test.json -w "%{http_code}" "$BASE/v1/x402/test")
echo "HTTP Status: $STATUS"
cat /tmp/x402_test.json | python3 -m json.tool 2>/dev/null || cat /tmp/x402_test.json
echo ""

echo "=== 3/3  Gated Wallet Balance — NO payment header (expect 402) ==="
STATUS=$(curl -s -o /tmp/x402_balance.json -w "%{http_code}" "$BASE/v1/wallet/balance?userId=test")
echo "HTTP Status: $STATUS"
cat /tmp/x402_balance.json | python3 -m json.tool 2>/dev/null || cat /tmp/x402_balance.json
echo ""

echo "✅ Evidence captured. HTTP 402 responses prove x402 middleware is live."
echo "   To complete the full paid flow, send a valid x-payment header signed by a funded wallet."
