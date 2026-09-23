- [Payment providers](ashtechpay-integration.md) — activation and formation pay-ins can use AshtechPay or DrimPay; withdrawals stay manual
- [Security hardening](security-hardening.md) — rate limiters, helmet, CORS, hardcoded admin creds moved to env/secrets, Telegram intrusion alerts; see file for required env vars

- [Plesk deploy "looks broken"](plesk-deploy-stale-browser-cache.md) — check stale browser cache (incognito test) before debugging code when a fresh deploy seems not to work

- [Nexarix IP blocking](nexarix-ip-blocking.md) — DB-backed persistent IP blocks on rate-limit trip, survives restarts; needs drizzle push per-env to activate
- [Prod DB schema drift](prod-db-schema-drift.md) — prod Supabase lags behind schema → 500 on login; startup migration auto-repairs users columns; direct pooler access via PROD_SUPABASE_* secrets
