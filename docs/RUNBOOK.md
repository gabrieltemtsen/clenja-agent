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

## 5) Fly.io API deploy (monorepo-safe)
```bash
# from repo root
flyctl apps create clenja-agent-api
flyctl deploy -c apps/api/fly.toml --ha=false
# if app fails, inspect startup path quickly:
flyctl ssh console -a clenja-agent-api -C "ls -la /app/apps/api/dist || true; ls -la /app/apps/api/dist/src || true"
```

Set secrets:
```bash
flyctl secrets set \
  THIRDWEB_SECRET_KEY=... \
  X402_SERVER_WALLET=0x... \
  X402_NETWORK=celo \
  PARA_MODE=mock \
  OFFRAMP_MODE=mock \
  STATE_DB_PATH=./.data/state.json
```

## Notes
- Without x402 env configured, paid endpoints return `503 x402_not_configured`.
- With x402 configured but no payment header, endpoints return `402 Payment Required`.
- `x-payment` header is accepted for test clients.
- Para adapter supports `PARA_MODE=mock|live`. In `live`, API calls use `PARA_API_BASE` + `PARA_API_KEY`.
- You can customize Para endpoint paths with `PARA_EP_*` env variables.
- Para live mode supports timeout (`PARA_TIMEOUT_MS`) and fallback behavior (`PARA_FALLBACK_TO_MOCK_ON_ERROR`).
- Offramp also supports `OFFRAMP_MODE=mock|live` with `OFFRAMP_API_BASE`, `OFFRAMP_API_KEY`, `OFFRAMP_EP_*`, timeout, and fallback.
- Check readiness with `GET /v1/readiness`.
- State is persisted in `STATE_DB_PATH` (default `./.data/state.json`).
