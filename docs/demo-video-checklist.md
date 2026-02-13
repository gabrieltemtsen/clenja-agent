# Demo Video Checklist (One-Take)

## Pre-flight (2 min)
- [ ] API running (`pnpm --filter @clenja/api dev`)
- [ ] Web running (`pnpm --filter @clenja/web dev`)
- [ ] `NEXT_PUBLIC_API_BASE` set if needed
- [ ] x402 env configured (or explicitly show mock payment header path)

## Seed data (30 sec)
```bash
cd apps/api
./scripts/demo-seed.sh
```

## Recording flow (3-4 min)
1. Open `/demo-script` and explain roadmap.
2. Open `/agent`, send: `cashout 50 cUSD`.
3. Confirm challenge (`123456` in demo mode).
4. Open `/beneficiaries`, show saved beneficiary.
5. Open `/cashout-status`, fetch/update payout state.
6. Open `/dashboard`, load overview and show receipts + cashouts.
7. Mention x402 paid endpoints and security controls.

## Must-say lines
- "CLENJA is Telegram-first, agentic, and Celo-native."
- "Actions are policy-gated and challenge-confirmed."
- "We expose x402 paid APIs so other agents can integrate."
- "Self unavailable in our region; evidence attached in submission."
