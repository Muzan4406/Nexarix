---
    name: Nexarix persistent IP blocking (bot/brute-force defense)
    description: How automatic IP blocking is implemented — DB-backed, not just in-memory rate limiting — and what it takes to activate it in a new environment.
    ---

    **What it does:** When any rate limiter (login, register, admin login, OTP verify, global API) is exceeded, the offending IP is inserted into a `blocked_ips` table (via `blockIp()` in `security.ts`) with a reason and expiry, and a Telegram alert fires. A middleware (`blockedIpGuard`, mounted early in `app.ts` on `/api`) checks every request's IP against this table (with a 15s in-memory cache to avoid hammering the DB) and returns 403 before any other work happens.

    **Why DB-backed instead of just express-rate-limit's in-memory store:** in-memory blocks reset on every server restart/redeploy, so a determined bot just waits out a redeploy. Persisting to DB survives restarts. Block durations are IP+category-based (1h login, 1h register, 24h admin/OTP, 2h global-scan) — tune in `security.ts` if the durations feel wrong for the traffic pattern.

    **Admin control:** `GET/POST /admin/blocked-ips` and `DELETE /admin/blocked-ips/:ip` let an admin list, manually block, or unblock an IP (useful for false positives, e.g. shared corporate/mobile-carrier IPs).

    **How to apply / activate in a new environment:** the `blocked_ips` table must exist — run `pnpm --filter @workspace/db run push` against that environment's DB (dev and prod are separate; pushing to dev does NOT touch prod). Skipping this makes `blockIp()` silently fail (caught and swallowed) and the guard never blocks anything.
    