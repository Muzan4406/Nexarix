---
name: Nexarix Security Hardening
description: Decisions and conventions from the security audit and hardening of the API server.
---

# Nexarix — Security Hardening Decisions

## What was done

### New file: `artifacts/api-server/src/lib/security.ts`
Central hub for all security helpers. Contains:
- `getClientIp()` — extracts real IP from X-Forwarded-For (Plesk/Nginx proxy)
- `alertIntrusion(event, details, req)` — sends Telegram alert with IP + UA
- `trackFailedLogin(req, identifier)` — in-memory failed-login counter; alerts at 3rd attempt and every 5th after
- `resetFailedLogin(req)` — clears counter on successful login
- Rate limiters (express-rate-limit): `loginLimiter` (10/15min), `registerLimiter` (5/1h), `adminLoginLimiter` (5/15min), `otpLimiter` (5/5min), `globalApiLimiter` (200/1min)

### `app.ts`
- Added `helmet()` (security headers: HSTS, X-Frame-Options, etc.)
- CORS restricted via `ALLOWED_ORIGINS` env var (comma-separated); empty = allow all (dev-friendly)
- JWT secret consolidated into a module-level const (same pattern as auth.ts); removed stale `"dev-secret"` fallback
- `globalApiLimiter` applied to all `/api/*` routes

### `routes/auth.ts`
- `loginLimiter` on POST `/auth/login`
- `registerLimiter` on POST `/auth/register`
- `trackFailedLogin` on wrong credentials
- `resetFailedLogin` on success
- Telegram alert when a banned account tries to log in

### `routes/admin.ts`
- **Hardcoded credentials removed** — replaced with `process.env.ADMIN_EMAIL`, `process.env.ADMIN_USERNAME`, `process.env.ADMIN_PASSWORD`
- `adminLoginLimiter` on POST `/admin/login`
- `otpLimiter` on POST `/admin/verify-otp`
- Telegram alert on every failed admin login (wrong account or wrong password)
- PATCH `/admin/tasks/:taskId` rewritten from a `fields` allowlist loop with `req.body[f]` bracket access to explicit named destructuring — same behavior, but avoids the bracket-notation object-injection pattern static scanners (and future reviewers) flag as HIGH.

### `routes/users.ts`
- `isValidAvatarUrl()` guard on PATCH `/users/profile` to reject non-URL values

## Telegram HTML-injection convention (2026-07-15)
Every `sendTelegramNotification(...)` call uses `parse_mode: "HTML"`. Any interpolated value that can originate from user input (username, email, phone, country, task/formation/service title or description, free-text fields, etc.) MUST be passed through `escapeHtml()` from `artifacts/api-server/src/lib/telegram.ts` before interpolation, or a malicious value (e.g. a username containing `<a href=...>`) can break message formatting or inject fake links/content into admin alerts.

**Why:** a prior pass only escaped values in `security.ts`'s own alerts; a full SAST sweep found the same unescaped-interpolation pattern repeated across `routes/activation.ts`, `routes/admin.ts`, `routes/formations.ts`, `routes/services.ts`, `routes/withdrawals.ts`. All were fixed in one pass. `routes/telegram.ts`'s bot-command replies were left as-is — those values are typed by the admin themselves through their own authenticated Telegram chat, not attacker-controlled.

**How to apply:** when adding a new `sendTelegramNotification` call with any field that traces back to a request body, DB row populated from user input, or query param, wrap it in `escapeHtml(...)` (coerce to string first if it might be non-string/null).

## Environment variables required
- `ADMIN_EMAIL` — env var (shared) — set to godmuzan42@gmail.com
- `ADMIN_USERNAME` — env var (shared) — set to Muzan4406
- `ADMIN_PASSWORD` — Replit Secret — set via requestSecrets
- `ALLOWED_ORIGINS` — env var (shared, optional) — comma-separated allowed origins for CORS; empty = allow all
- `JWT_SECRET` — Replit Secret — must be set in production

**Why:** Admin credentials were hardcoded in source code, visible to anyone with repo access and in git history. Moving to env/secrets prevents exposure.

## Packages added
- `express-rate-limit` — rate limiting
- `helmet` — security headers

## Known open risk (user declined to fix, 2026-07-13 and 2026-07-14)
`JWT_SECRET` and `ADMIN_PASSWORD` are still unset in this dev environment (app runs in a degraded/fallback mode). Without `JWT_SECRET` set explicitly in production, do not assume tokens are safe — check `auth.ts` for the fallback behavior before deploying. `lib/db` connects with `ssl: { rejectUnauthorized: false }` for the Supabase pooler path — acceptable for now but means TLS MITM on that hop isn't detected; only matters when `SUPABASE_PROJECT_REF`/`SUPABASE_DB_PASSWORD` are set (dev uses local unencrypted Postgres instead).
