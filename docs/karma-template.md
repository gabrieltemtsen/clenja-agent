# Karma Submission Template

## Project Name
CLENJA

## One-liner
Telegram-first agentic finance assistant on Celo with x402-paid APIs.

## Problem
Cross-border and local payment flows remain fragmented for many users, especially mobile-first users in African corridors.

## Solution
CLENJA provides natural-language finance actions (balance, send, cashout), with security checks and confirmations, while exposing reusable x402 endpoints for external agents.

## What we built
- Agentic chat orchestration (`/chat/message`, `/chat/confirm`)
- Wallet + send preparation routes
- Offramp quote/create/status routes
- Beneficiary save/list flow
- Dashboard hooks + web console
- x402 middleware (thirdweb)

## Why Celo
Low-cost, fast, stablecoin-native environment aligned to real-world usage.

## Infra Story
CLENJA APIs can be consumed by other agents/devs via x402 payment-gated endpoints.

## Security and Trust
- Confirmation challenges
- Policy limits (daily/per-action)
- Persistent receipts and state
- Modular adapters for wallet/offramp providers

## Region Constraint
Self currently unavailable in our region; screenshot attached.

## Links
- Repo: <REPO_LINK>
- Demo: <DEMO_LINK>
- Tweet: <TWEET_LINK>
