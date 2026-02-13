# Architecture Outline

## 1) Conversational Layer (Agentic)
User writes natural language in Telegram/WhatsApp.

Pipeline:
1. Intent + entity extraction
2. Policy evaluation (risk/caps/recipient checks)
3. Quote/simulation
4. Confirmation challenge
5. Execution via wallet/offramp adapters
6. Receipt + status notifications

## 2) Wallet Layer
Adapter interface (`WalletProvider`):
- `createOrLinkUserWallet(userId)`
- `getBalance(userId)`
- `prepareSend(input)`
- `executeSend(input)`
- `exportWallet(userId)`

Primary provider for MVP: **Para** (Telegram-friendly pregen/setup patterns).

## 3) Offramp Layer (Provider-Agnostic)
Adapter interface (`OfframpProvider`):
- `getSupportedCountries()`
- `quote({fromToken, amount, country, currency})`
- `createPayout({quoteId, beneficiary, otp})`
- `getPayoutStatus(payoutId)`

MVP uses `MockOfframpProvider` with realistic status transitions.

## 4) Infra Layer (x402)
Paid endpoints for external agents/devs:
- `GET /v1/wallet/balance`
- `POST /v1/wallet/send/prepare`
- `POST /v1/offramp/quote`
- `POST /v1/offramp/create`

Unpaid requests return `402 Payment Required`.

## 5) Data Layer
Store:
- user/profile mapping
- wallet mapping metadata
- beneficiaries
- confirmations/challenges
- spend counters
- receipts
- offramp orders

Recommended: Postgres + Prisma.

## 6) Security Controls
- strict allowlist for supported tokens/chains (Celo only)
- caps engine: daily + per-tx + per-recipient
- new-beneficiary challenge
- immutable receipt log
- secrets vault/environment isolation
