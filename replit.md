# Nexarix — Digital Revenue Platform

A full-stack platform for managing user memberships, formations, tasks, store, and withdrawals — with a Sendavapay payment integration and Telegram bot notifications.

## Stack

- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui (`artifacts/nexarix`)
- **Backend:** Express 5 + Drizzle ORM + Supabase Storage (`artifacts/api-server`)
- **Monorepo:** pnpm workspaces

## How to run

Two workflows are configured and run in parallel:

| Workflow | Command | Port |
|---|---|---|
| `artifacts/nexarix: web` | `pnpm --filter @workspace/nexarix run dev` | 5000 (proxied) |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |

The Vite dev server proxies `/api` requests to `http://localhost:8080`.

## Required environment variables / secrets

These must be set in Replit Secrets for the API server to be fully functional:

| Secret | Purpose |
|---|---|
| `SESSION_SECRET` | Express session signing |
| `JWT_SECRET` | JWT token signing |
| `SUPABASE_PROJECT_REF` | Supabase project for file storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role access |
| `TELEGRAM_BOT_TOKEN` | Telegram bot for notifications |
| `TELEGRAM_CHAT_ID` | Target Telegram channel/group |

Payment (Sendavapay) credentials are configured through the admin dashboard settings.

## Project structure

```
artifacts/
  nexarix/          # React frontend
    src/
      pages/        # Route-level page components
      components/   # Shared UI components
      hooks/        # Custom React hooks
      lib/          # API client, utils
  api-server/       # Express API
    src/
      routes/       # REST route handlers
      lib/          # Auth, DB, Supabase, migrations
      middlewares/  # Auth middleware
libs/               # Shared workspace packages (api-zod, db schema)
```

## Plesk deployment

The production build is committed directly to the repo (`.gitignore` explicitly allows `artifacts/api-server/dist/` and `artifacts/api-server/public/`). No build step needed on the server — everything is pre-bundled.

### Plesk Node.js app configuration

| Setting | Value |
|---|---|
| Node.js version | 20 (see `.nvmrc`) |
| Application root | `/` (repo root) |
| Application startup file | `artifacts/api-server/dist/index.mjs` |
| npm install | **Not required** — all dependencies are bundled by esbuild |

### Required environment variables (set in Plesk → Node.js → Environment variables)

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Port assigned by Plesk (e.g. `3000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session signing |
| `JWT_SECRET` | JWT token signing |
| `SUPABASE_PROJECT_REF` | Supabase project for file storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role access |
| `TELEGRAM_BOT_TOKEN` | Telegram bot for notifications (optional) |
| `TELEGRAM_CHAT_ID` | Target Telegram channel (optional) |

### Deploy workflow

1. `git push` from Replit
2. Plesk → Git → **Pull**
3. Plesk → **Deploy now** (or Restart)

No rebuild, no install — the app starts immediately.

## User preferences

- Language: French (app UI is in French)
