#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8787}"
PAY="${X_PAYMENT:-demo_payment_header}"

echo "# health"
curl -s "$API_BASE/health" | jq .

echo "\n# balance"
curl -s -H "x-payment: $PAY" "$API_BASE/v1/wallet/balance" | jq .

echo "\n# send prepare"
PREP=$(curl -s -X POST -H "content-type: application/json" -H "x-payment: $PAY" \
  "$API_BASE/v1/wallet/send/prepare" \
  -d '{"fromUserId":"tg:123","token":"cUSD","amount":"10","to":"0xabc1234"}')
echo "$PREP" | jq .
CHALLENGE_ID=$(echo "$PREP" | jq -r '.challengeId')

if [ "$CHALLENGE_ID" != "null" ] && [ -n "$CHALLENGE_ID" ]; then
  echo "\n# send confirm"
  curl -s -X POST -H "content-type: application/json" -H "x-payment: $PAY" \
    "$API_BASE/v1/wallet/send/confirm" \
    -d "{\"userId\":\"tg:123\",\"challengeId\":\"$CHALLENGE_ID\",\"answer\":\"1234\"}" | jq .
fi

echo "\n# offramp quote"
curl -s -X POST -H "content-type: application/json" -H "x-payment: $PAY" \
  "$API_BASE/v1/offramp/quote" \
  -d '{"userId":"tg:123","fromToken":"cUSD","amount":"50","country":"NG","currency":"NGN"}' | jq .

echo "\n# offramp create"
curl -s -X POST -H "content-type: application/json" -H "x-payment: $PAY" \
  "$API_BASE/v1/offramp/create" \
  -d '{"userId":"tg:123","quoteId":"oq_demo","beneficiary":{"country":"NG","bankName":"GTBank","accountName":"Gabriel","accountNumber":"0123456789"},"otp":"123456"}' | jq .
