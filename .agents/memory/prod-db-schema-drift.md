---
name: Prod DB schema drift
description: Supabase prod DB lags behind drizzle schema; login/register 500 when a users column is missing
---
Prod Supabase DB is NOT updated by drizzle push automatically — schema drift causes 500 on any route selecting all users columns (drizzle selects every schema column). Aug 2026: missing `task_balance` broke all logins in prod.

**Why:** Plesk deploys via git pull only; no migration tooling runs against prod except the startup migration in the api-server.

**How to apply:** startup migration (migrate.ts) now has an auto-repair `ALTER TABLE users ADD COLUMN IF NOT EXISTS ...` block — keep it in sync when adding users columns. For urgent fixes, connect directly with pg via pooler URL `postgres.<ref>@aws-0-eu-west-1.pooler.supabase.com:6543` using PROD_SUPABASE_PROJECT_REF + PROD_SUPABASE_DB_PASSWORD secrets. Note: query information_schema with `table_schema='public'` or Supabase auth.users pollutes results.
