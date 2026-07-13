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

### `routes/users.ts`
- `isValidAvatarUrl()` guard on PATCH `/users/profile` to reject non-URL values

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
