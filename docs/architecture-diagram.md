# CLENJA Architecture (Text Diagram)

```text
Telegram / WhatsApp User
        |
        v
   OpenClaw Agent Layer
(intent parse -> policy -> challenge -> execute)
        |
        v
      API Layer (apps/api)
  ┌───────────────┬─────────────────┬──────────────────┐
  | Chat Routes   | Wallet Routes   | Offramp Routes   |
  | /chat/*       | /wallet/*       | /offramp/*       |
  └───────────────┴─────────────────┴──────────────────┘
        |                 |                    |
        |                 |                    |
        v                 v                    v
  State Store        Wallet Adapter       Offramp Adapter
(challenges, policy,  (Para mock/live)    (mock now, real provider later)
 receipts, cashouts)
        |
        v
  x402 Middleware (thirdweb)
(payment-gated infra endpoints)
        |
        v
 External Agents / Devs (paid API consumers)
```
