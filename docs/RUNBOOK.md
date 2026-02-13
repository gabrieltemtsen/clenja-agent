# Runbook

## 1) Start API
```bash
cd apps/api
cp .env.example .env
# set THIRDWEB_SECRET_KEY + X402_SERVER_WALLET for real x402 settlement
pnpm dev
```

## 2) Quick endpoint test
In another terminal:
```bash
cd apps/api
./scripts/test-endpoints.sh
```

## Notes
- Without x402 env configured, paid endpoints return `503 x402_not_configured`.
- With x402 configured but no payment header, endpoints return `402 Payment Required`.
- `x-payment` header is accepted for test clients.
