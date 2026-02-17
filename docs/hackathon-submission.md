# CLENJA — Hackathon Submission Pack

## Project
CLENJA is a Telegram-first agentic finance assistant on Celo with wallet operations, cashout orchestration, cooperative finance primitives, and x402-paid APIs for other agents.

## Track Mapping

### Track 1 — Best Agent on Celo
- Real-world utility: chat-first balance, send, cashout flows
- Economic agency: policy-constrained action execution
- Global utility: mobile-first + stablecoin-native + Africa-focused cashout UX
- Trust: challenge confirmations, receipts, status lifecycle

### Track 2 — Best Agent Infra on Celo
- x402 monetized API layer
- Reusable wallet/offramp endpoints
- Adapter pattern (wallet provider, offramp provider)
- Developer-friendly web console + endpoint hooks

## Submission Evidence Checklist
- [ ] Karma project link
- [ ] Demo video link
- [x] Repo link: https://github.com/gabrieltemtsen/clenja-agent
- [ ] Tweet link tagging @Celo and @CeloDevs
- [ ] x402 endpoint evidence (request/402/paid flow)
- [x] Onchain tx/receipt examples (swap execution samples captured)
- [x] ERC-8004 agent registration: https://www.8004scan.io/agents/celo/132
- [ ] Self unavailable-region screenshot attached
- [ ] (Optional) Molthunt registration link

## Self Availability Note
Self is not available in our region currently. Include screenshot evidence from the app's unsupported-region notice in the final submission.

## API Highlights
- `POST /v1/chat/message`
- `POST /v1/chat/confirm`
- `GET /v1/wallet/balance`
- `POST /v1/wallet/send/prepare`
- `POST /v1/offramp/quote`
- `POST /v1/offramp/create`
- `GET /v1/offramp/status/:payoutId`

## Demo Story (Short)
1. User sends natural language request in chat
2. Agent parses intent, enforces policy, issues challenge
3. User confirms; action executes and receipt is stored
4. Web console shows balance, receipts, beneficiaries, cashout status
5. External agent/dev calls x402 endpoint as paid API consumer
