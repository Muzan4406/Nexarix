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

## User preferences

- Language: French (app UI is in French)
