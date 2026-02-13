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

## 3) Start web console
```bash
cd apps/web
pnpm dev
```
Then open `http://localhost:3000` and use:
- `/dashboard`
- `/beneficiaries`
- `/cashout-status`
- `/agent` (chat + confirm playground)
- `/demo-script` (judge flow)

## 4) Build submission bundle
```bash
make submission-pack
# or with links
REPO_LINK="https://github.com/gabrieltemtsen/clenja-agent" DEMO_LINK="https://..." KARMA_LINK="https://..." TWEET_LINK="https://x.com/..." make submission-pack
```

## Notes
- Without x402 env configured, paid endpoints return `503 x402_not_configured`.
- With x402 configured but no payment header, endpoints return `402 Payment Required`.
- `x-payment` header is accepted for test clients.
- Para adapter supports `PARA_MODE=mock|live`. In `live`, API calls use `PARA_API_BASE` + `PARA_API_KEY`.
- State is persisted in `STATE_DB_PATH` (default `./.data/state.json`).
