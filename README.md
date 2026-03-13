# Clenja Agent

Telegram-first AI finance assistant on Celo — chat to send, swap, and cash out crypto to local money.

## What It Does

Clenja lets anyone manage crypto finances through natural conversation — no wallets, no jargon. Just type what you want.

```
You:    Send 5 cUSD to Gabriel
Clenja: ✅ Sent! 5 cUSD → 0xabc...

You:    Cashout 10 cUSD
Clenja: 💸 Where are you sending cash to?
        [🇳🇬 NGN] [🇰🇪 KES] [🇬🇭 GHS] [🇺🇬 UGX]
        [🇹🇿 TZS] [🇲🇼 MWK] [🇧🇷 BRL]

You:    *taps Kenya (KES)*
Clenja: You'll receive about 1,280 KES · Quote valid for 5 min
        Send bank details: 254712345678 MPESA

You:    254712345678 MPESA
Clenja: Got it ✅ Reply with OTP 123456 to confirm.
```

## Supported Cashout Corridors

| Country | Currency | Example |
|---------|----------|---------|
| 🇳🇬 Nigeria | NGN | `0812345678 Access Bank` |
| 🇰🇪 Kenya | KES | `254712345678 MPESA` |
| 🇬🇭 Ghana | GHS | `0244567890 MTN Mobile Money` |
| 🇺🇬 Uganda | UGX | `256701234567 MTN Uganda` |
| 🇹🇿 Tanzania | TZS | `255621234567 Vodacom Tanzania` |
| 🇲🇼 Malawi | MWK | `265881234567 Airtel Malawi` |
| 🇧🇷 Brazil | BRL | `11987654321 Pix` |

Powered by **[Clova Pay Africa](https://github.com/gabrieltemtsen/clova-pay-africa)** + **Paycrest**.

## Core Features

- **Natural language intents** — no rigid commands needed
- **Send & receive** — cUSD and CELO on Celo
- **Swap** — CELO ↔ cUSD
- **Cash out** — crypto → local bank or mobile money across 7 corridors
- **Saved recipients** — name + address shortcuts
- **Spending limits** — daily caps + per-tx limits
- **OTP confirmation** — every cashout requires OTP `123456` (test) before executing
- **Receipts & audit trail** — full history of sends, swaps, and cashouts
- **x402 pay-per-call** — API endpoints priced per call for agent integrations

## Supported Intents

| What you type | What happens |
|---------------|-------------|
| `balance` | Shows cUSD + CELO balance |
| `send 5 cUSD to 0xabc...` | Sends tokens with policy check |
| `send 10 CELO to Gabriel` | Sends to saved recipient |
| `swap 5 CELO to cUSD` | Token swap |
| `cashout 10 cUSD` | Opens country selector → offramp flow |
| `cashout status ord_abc` | Tracks a cashout order |
| `save recipient Gabriel 0xabc...` | Saves a recipient |
| `set daily limit 50` | Sets spending cap |
| `history` | Recent transactions |

## Architecture

```
apps/
  bot-telegram/        # Telegram bot (polling or webhook)
    src/index.js       # Handles messages, inline buttons, callback queries
  api/                 # Express API
    src/
      routes/
        chat.ts        # Main intent handler — all bot messages flow here
        offramp.ts     # Cashout quote + create endpoints
        wallet.ts      # Balance, send, swap
        beneficiaries.ts
        audit.ts
      adapters/
        offramp.ts     # Clova Pay Africa integration (live) + mock fallback
        wallet.ts      # Celo wallet operations
      lib/
        intents.ts     # Regex + LLM intent parser
        intentRouter.ts
        policy.ts      # Spending limits
        stateMachine.ts # OTP + pending action state
        config.ts
  web/                 # Next.js demo/product site
```

## Offramp Integration

Clenja uses **[Clova Pay Africa](https://github.com/gabrieltemtsen/clova-pay-africa)** as its offramp backend:

1. Clenja calls `POST /v1/quotes` → gets rate + quoteId
2. User selects country via inline button → correct currency used
3. User sends bank/mobile details → Clenja resolves institution code via live Paycrest API
4. Clenja calls `POST /v1/orders` with `destinationCurrency` → gets deposit address
5. User deposits → Paycrest routes payout → webhook updates status

**Mobile money auto-detection:**
- `MPESA` / `M-PESA` → `SAFAKEPC` (Safaricom Kenya)
- `MTN` → `MOMOGHPC` (Ghana) or `MOMOUGPC` (Uganda) based on country
- `Tigo Pesa` → `TIGOTZPC` (Tanzania)
- `Pix` → `PIXKBRPC` (Brazil)
- Phone prefix `254` → Kenya, `234` → Nigeria, `233` → Ghana, etc.

## Quick Start

```bash
# API
cd apps/api
cp .env.example .env
pnpm install
pnpm dev   # http://localhost:8787

# Telegram bot
cd apps/bot-telegram
cp .env.example .env   # set TELEGRAM_BOT_TOKEN + CLENJA_API_BASE
node src/index.js
```

## Key Environment Variables

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | From BotFather |
| `CLENJA_API_BASE` | URL of the clenja API (default: http://localhost:8787) |
| `OFFRAMP_API_BASE` | Clova Pay Africa URL |
| `OFFRAMP_API_KEY` | x402 / owner API key for clova-pay |
| `OFFRAMP_MODE` | `live` or `mock` |
| `LLM_API_KEY` | OpenAI key for LLM intent fallback (optional) |

## Safety

- All sends/swaps require OTP confirmation
- Daily spend caps enforced per user
- New recipients get extra verification prompt
- Every action logged to audit trail
- Receipts stored with tx hash / order ID

## Powered By

- [Clova Pay Africa](https://github.com/gabrieltemtsen/clova-pay-africa) — offramp rails
- [Paycrest](https://paycrest.io) — multi-corridor routing
- Celo — stablecoin chain (cUSD)
