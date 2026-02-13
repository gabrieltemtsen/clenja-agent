# Implementation Plan (Next 48h)

## 1. API first
- [x] scaffold express API
- [x] wallet and offramp routes
- [x] x402 middleware placeholder
- [ ] wire thirdweb settlePayment in middleware

## 2. Agentic bot orchestration
- [ ] intent parser (balance/send/cashout/history/loan)
- [ ] policy engine integration (caps + beneficiary challenge)
- [ ] confirmation challenge state machine

## 3. Wallet integration (Para)
- [ ] adapter interface + Para implementation
- [ ] user wallet link/create flow
- [ ] balance + transfer execution

## 4. Web app
- [x] Next.js scaffold page
- [ ] dashboard: balances/history
- [ ] cashout flow UI (mock)
- [ ] dev docs page for x402 endpoints
