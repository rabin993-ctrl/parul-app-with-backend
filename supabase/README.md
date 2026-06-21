# supabase/ — backend lives here

This folder is the **backend codebase**, version-controlled in git and deployed to your Supabase
project with the Supabase CLI. Nothing here ships in the mobile app; the app talks to the deployed
project at runtime via `src/lib/supabase.ts`.

```
supabase/
  config.toml          # created by `npx supabase init` (auth, db, api config) — see PREREQUISITES
  migrations/          # SQL schema, applied in order (the database, doc 02)
  functions/           # Edge Functions (Deno) — server-side logic that isn't pure SQL
    _shared/           #   shared utils (cors, supabase admin client, etc.)
  seed.sql             # demo/seed data (created by init / Wave 7)
```

## How the backend is "stored in Supabase"

- **Schema** is git-tracked SQL in `migrations/`. `npm run db:push` applies it to the linked project;
  `npm run db:reset` rebuilds a local/remote DB from scratch + `seed.sql`. The remote Postgres is the
  running database; these files are its source of truth.
- **Edge Functions** are git-tracked in `functions/`; `npm run fn:deploy` publishes them.
- **Types** are generated FROM the live schema back into the app: `npm run gen:types`.
- **Auth / Storage / Realtime** config lives in `config.toml` (+ dashboard). RLS policies live in
  migrations alongside the tables.

So: write SQL + functions here → push → the live Supabase project runs them → the app consumes them.
Git is the code home; Supabase is the running backend.

## Commands (from repo root)

| Command | Does |
|---------|------|
| `npm run db:push` | apply `migrations/` to the linked project |
| `npm run db:seed-vault` | store anon key in Vault for pg_net → edge function triggers |
| `npm run db:reset` | rebuild DB from migrations + `seed.sql` |
| `npm run db:diff` | generate a migration from schema changes |
| `npm run gen:types` | regenerate `src/lib/db-types.ts` from the live schema |
| `npm run fn:serve` | run Edge Functions locally |
| `npm run fn:deploy` | deploy Edge Functions |

## Build order

Tables + RLS are authored as migrations in **Wave 0** (doc 02). Each later wave adds its migrations +
functions for its domain. See `build-waves/` and `docs/backend/07-7day-execution-plan.md`.
