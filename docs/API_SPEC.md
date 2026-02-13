# API Spec (MVP)

Base URL: `/v1`
Chain: Celo

## Auth + Billing
x402 middleware gates paid endpoints.
- If unpaid: `402 Payment Required`
- If paid: process and return response with `paymentReceiptId`

---

## GET `/wallet/balance`
Returns user balance snapshot.

### Response
```json
{
  "walletAddress": "0x...",
  "chain": "celo",
  "balances": [
    {"token": "CELO", "amount": "10.2", "usd": "7.14"},
    {"token": "cUSD", "amount": "53.0", "usd": "53.0"}
  ],
  "paymentReceiptId": "x402_rcpt_..."
}
```

## POST `/wallet/send/prepare`
Pre-flight quote/simulation for transfer.

### Request
```json
{
  "fromUserId": "tg:123",
  "token": "cUSD",
  "amount": "12.5",
  "to": "0xabc..."
}
```

### Response
```json
{
  "quoteId": "q_...",
  "networkFee": "0.001",
  "estimatedArrival": "instant",
  "requiresChallenge": true,
  "challengeType": "new_recipient_last4",
  "paymentReceiptId": "x402_rcpt_..."
}
```

## POST `/offramp/quote`
Returns payout quote for bank cashout.

### Request
```json
{
  "userId": "tg:123",
  "fromToken": "cUSD",
  "amount": "50",
  "country": "NG",
  "currency": "NGN"
}
```

### Response
```json
{
  "quoteId": "oq_...",
  "rate": "1520.1",
  "fee": "1.2",
  "receiveAmount": "74239.8",
  "eta": "5-30 min",
  "paymentReceiptId": "x402_rcpt_..."
}
```

## POST `/offramp/create`
Creates payout order after confirmation.

### Request
```json
{
  "userId": "tg:123",
  "quoteId": "oq_...",
  "beneficiary": {
    "country": "NG",
    "bankName": "GTBank",
    "accountName": "John Doe",
    "accountNumber": "0123456789"
  },
  "otp": "493201"
}
```

### Response
```json
{
  "payoutId": "po_...",
  "status": "pending",
  "debitedToken": "cUSD",
  "debitedAmount": "50",
  "paymentReceiptId": "x402_rcpt_..."
}
```

## POST `/chat/message`
Agentic natural-language entrypoint.
- Parses intents (`balance`, `send`, `cashout`)
- Returns confirmation challenge for risky actions

## POST `/chat/confirm`
Completes challenge-based actions.
- `new_recipient_last4` for sends
- `cashout_otp` for cashout

## Beneficiaries
- `POST /beneficiaries` save beneficiary
- `GET /beneficiaries?userId=...` list saved beneficiaries

## Offramp status
- `GET /offramp/status/:payoutId` get payout status
- `POST /offramp/status/:payoutId` update payout status (mock lifecycle)

## Dashboard hooks
- `GET /dashboard/overview?userId=...` returns `{ balance, receipts, cashouts }`

## Agent chat orchestration
- `POST /chat/message` accepts `{ userId, text }`
- `POST /chat/confirm` accepts `{ userId, challengeId, answer }`
