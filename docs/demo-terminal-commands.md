# Demo Terminal Commands

```bash
# 1) run api
cd apps/api
cp .env.example .env
pnpm dev
```

```bash
# 2) run web
cd apps/web
pnpm dev
```

```bash
# 3) seed demo data
cd apps/api
./scripts/demo-seed.sh
```

```bash
# 4) optional: prove x402 behavior
curl -i http://localhost:8787/v1/wallet/balance
curl -i -H "x-payment: demo_payment_header" "http://localhost:8787/v1/wallet/balance?userId=tg:demo-1"
```
