# Karma Submission Template (Ready-to-Paste)

## Project Name
CLENJA

## One-liner
Telegram-first autonomous finance agent on Celo with real wallet actions, live swaps, and x402-paid APIs for agent-to-agent integration.

## Problem
Mobile-first users and builders still face fragmented payment rails: wallets, token swaps, and local cashout are often disconnected, hard to automate, and difficult to integrate safely for AI agents.

## Solution
CLENJA unifies these into one conversational interface and API layer. Users can request actions in natural language, receive challenge-based confirmation prompts, and execute transactions on Celo with receipt visibility. Developers and other agents can consume CLENJA via paid API endpoints secured with x402.

## What we built
- Telegram-first conversational agent UX
- Intent routing + confirmation challenge flow (`/v1/chat/message`, `/v1/chat/confirm`)
- Live custodial wallet execution (Turnkey) on Celo
- Balance + send flows with receipt tracking
- CELO <-> cUSD swap flow with revert-safe execution and receipt verification
- Offramp module (mock mode for demo velocity) with quote/create/status lifecycle
- Beneficiary/recipient memory flows (save/list/update/delete with safety confirms)
- x402 payment-gated API layer (Thirdweb) for infra track narrative
- Web console pages for agent, beneficiaries, dashboard, and payout status

## Why Celo
Celo is ideal for real-world agentic payments: low fees, fast confirmations, and strong stablecoin utility. It matches CLENJA’s focus on practical finance automation and emerging-market payment workflows.

## Infra Story
CLENJA is built as reusable agent infra:
- Payment-gated API endpoints via x402
- Adapter-based architecture (wallet/offramp provider abstraction)
- Policy + audit primitives suitable for multi-agent orchestration

## Security and Trust
- Explicit confirmation challenges before high-impact actions
- Policy/risk controls and action gating
- Persistent receipts + audit trail
- Improved swap reliability: allowance handling + onchain receipt status verification before success response

## Region Constraint
Self is currently unavailable in our region; unsupported-region evidence is included in submission materials.

## Links
- Repo: https://github.com/gabrieltemtsen/clenja-agent
- API Base (prod): https://clenjaapi-production.up.railway.app/
- Agent Registry (ERC-8004 / 8004scan): https://www.8004scan.io/agents/celo/132
- Demo: <ADD_DEMO_LINK>
- Tweet (tagging @Celo and @CeloDevs): <ADD_TWEET_LINK>
- Karma Project: <ADD_KARMA_LINK>
