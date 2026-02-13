#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8787}"
USER_ID="${USER_ID:-tg:demo-1}"
PAY="${X_PAYMENT:-demo_payment_header}"

echo "== CLENJA demo seed =="
echo "API_BASE=$API_BASE"
echo "USER_ID=$USER_ID"

# 1) Save beneficiary
BENEFICIARY=$(curl -s -X POST "$API_BASE/v1/beneficiaries" \
  -H "content-type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"country\":\"NG\",\"bankName\":\"GTBank\",\"accountName\":\"Demo User\",\"accountNumber\":\"0123456789\"}")

echo "[beneficiary]" && echo "$BENEFICIARY" | jq .
BID=$(echo "$BENEFICIARY" | jq -r '.beneficiary.id')

# 2) Ask agent for cashout (creates challenge)
MSG=$(curl -s -X POST "$API_BASE/v1/chat/message" \
  -H "content-type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"text\":\"cashout 50 cUSD\"}")

echo "[chat message]" && echo "$MSG" | jq .
CHALLENGE_ID=$(echo "$MSG" | jq -r '.challengeId')

# 3) Confirm challenge with mock OTP
if [ "$CHALLENGE_ID" != "null" ] && [ -n "$CHALLENGE_ID" ]; then
  CONFIRM=$(curl -s -X POST "$API_BASE/v1/chat/confirm" \
    -H "content-type: application/json" \
    -d "{\"userId\":\"$USER_ID\",\"challengeId\":\"$CHALLENGE_ID\",\"answer\":\"123456\"}")
  echo "[chat confirm]" && echo "$CONFIRM" | jq .
fi

# 4) Paid wallet prepare route (x402 header, for infra proof)
SEND_PREP=$(curl -s -X POST "$API_BASE/v1/wallet/send/prepare" \
  -H "content-type: application/json" -H "x-payment: $PAY" \
  -d "{\"fromUserId\":\"$USER_ID\",\"token\":\"cUSD\",\"amount\":\"5\",\"to\":\"0xabc1234\"}")

echo "[wallet send prepare]" && echo "$SEND_PREP" | jq .

# 5) Dashboard overview snapshot
OVERVIEW=$(curl -s "$API_BASE/v1/dashboard/overview?userId=$USER_ID")
echo "[dashboard overview]" && echo "$OVERVIEW" | jq .

echo "== demo seed complete =="
