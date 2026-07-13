- [Sendavapay integration](sendavapay-integration.md) — correct endpoints, payload fields, webhook HMAC-SHA256 format; no merchant_id needed, webhook URL configured in dashboard
- [Security hardening](security-hardening.md) — rate limiters, helmet, CORS, hardcoded admin creds moved to env/secrets, Telegram intrusion alerts; see file for required env vars

- [Plesk deploy "looks broken"](plesk-deploy-stale-browser-cache.md) — check stale browser cache (incognito test) before debugging code when a fresh deploy seems not to work

- [Nexarix IP blocking](nexarix-ip-blocking.md) — DB-backed persistent IP blocks on rate-limit trip, survives restarts; needs drizzle push per-env to activate
