# CLENJA Agent

Telegram-first (and WhatsApp-ready) agentic finance assistant on Celo.

## Vision
Natural-language wallet + payments + cooperative savings/loans + offramp cashout for African users, with x402-paid infra APIs for other agents.

## Tracks
- **Main track:** Real-world end-user utility via conversational finance.
- **Infra track:** Reusable paid APIs (x402) + SDK.

## Core MVP (P0)
1. Agentic chat intents (no rigid command dependency)
2. Per-user wallet integration (Para)
3. Balance and transfer with policy checks + confirmation
4. Cashout (offramp) mock flow for African corridors
5. x402 endpoints:
   - `GET /v1/wallet/balance`
   - `POST /v1/wallet/send/prepare`
   - `POST /v1/offramp/quote`
   - `POST /v1/offramp/create`
6. Receipts/audit trail

## Repository Structure
- `apps/bot-telegram` – OpenClaw-facing bot logic and conversational orchestration
- `apps/api` – business logic + x402 middleware + adapter layer
- `apps/web` – Next.js product/demo site + mini-app-compatible UX
- `packages/shared` – types, policy engine, validators
- `packages/sdk` – typed client SDK
- `packages/contracts` – coop/loan contracts

## Safety Baseline
- Confirm-before-send/offramp
- Extra verify for new recipients/beneficiaries
- Daily spend caps + per-recipient caps
- Simulate/quote before execution
- Persistent receipts with tx hash/order id/status

## Notes
- Self not available in user region: include unsupported-region evidence in submission package.
- Offramp starts as provider-agnostic mock; real provider adapters land after onboarding.
