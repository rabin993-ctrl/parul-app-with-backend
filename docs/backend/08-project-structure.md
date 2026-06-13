# 08 — Project Structure (frontend + backend in one repo)

The repo now holds the **existing RN/Expo app** and the **Supabase backend** side by side, with a thin
shared **infra layer** between them. The frontend `src/` tree was intentionally **left as-is** — it's
already well-organized, and the wave plan rewires *context internals* in place, so moving files would
break imports for no gain.

```
parul-app/
├── App.tsx, index.ts                # app entry (unchanged)
├── .env.example                     # copy → .env (EXPO_PUBLIC_* only)
├── app.json, tsconfig.json          # tsconfig now excludes supabase/ (Deno code)
│
├── src/
│   ├── lib/                         # ◀ NEW infra seam (frontend ↔ Supabase)
│   │   ├── supabase.ts              #   shared client (AsyncStorage session, anon key)
│   │   ├── env.ts                   #   validated EXPO_PUBLIC_* config
│   │   ├── db-types.ts              #   generated DB types (npm run gen:types)
│   │   ├── uploads.ts               #   Storage upload helper
│   │   └── cdn.ts                   #   thumb/full/signed URL helpers (CDN-aware)
│   ├── context/                     # data layer — rewired to Supabase, wave by wave (UNCHANGED API)
│   ├── components/ screens/ navigation/ hooks/ theme/ data/ dev/   # UI (unchanged)
│
├── supabase/                        # ◀ NEW backend (git-tracked, deployed via CLI)
│   ├── config.toml                  #   created by `supabase init` (auth/db/api)
│   ├── migrations/                  #   SQL schema + RLS (the database; doc 02)
│   ├── functions/                   #   Edge Functions (Deno)
│   │   └── _shared/                 #     cors.ts, admin.ts (service-role client)
│   └── seed.sql                     #   demo data
│
├── .github/
│   └── workflows/
│       └── deploy-web.yml           # CI/CD: push to main → build web → deploy to Vercel
├── vercel.json                      # Vercel config (buildCommand, outputDirectory, SPA rewrite)
├── scripts/
│   └── deploy-web.sh                # local convenience: expo export + vercel --prod
│
├── docs/backend/                    # the plan (00–08) + audits
└── build-waves/                     # paste-into-Claude-Code wave prompts (+ zip)
```

## The three layers and how they connect

1. **UI (`src/components`, `src/screens`, …)** — unchanged. Consumes contexts only.
2. **Data layer (`src/context/*`)** — each context keeps its public API but, wave by wave, its
   internals call **`src/lib/supabase.ts`** instead of mock data.
3. **Backend (`supabase/`)** — Postgres + RLS + Edge Functions, deployed to your Supabase project.
   The app reaches it at runtime via the client in `src/lib`.

## "Storing the codebase in Supabase," concretely

You don't upload the *app* to Supabase. You keep **all code in git** and deploy the **backend half**
to your Supabase project:

| Asset | Lives in git | Deployed to Supabase by |
|-------|--------------|-------------------------|
| Database schema + RLS | `supabase/migrations/*.sql` | `npm run db:push` |
| Server logic | `supabase/functions/*` | `npm run fn:deploy` |
| Auth/Storage/API config | `supabase/config.toml` | `supabase config push` / dashboard |
| Demo data | `supabase/seed.sql` | `npm run db:reset` |
| App ↔ DB types | `src/lib/db-types.ts` | generated *from* Supabase via `npm run gen:types` |

The **mobile app** deploys separately: native via **EAS** (iOS/Android), web via **Vercel** (GitHub
push to `main` triggers CI/CD → auto-deploy). Backend stays on managed Supabase.

## npm scripts added

```
npm run tsc          # typecheck the app (supabase/ excluded)
npm run db:push      # apply migrations to the linked project
npm run db:reset     # rebuild DB from migrations + seed.sql
npm run db:diff      # generate a migration from schema changes
npm run gen:types    # regenerate src/lib/db-types.ts from the live schema
npm run fn:serve     # run Edge Functions locally
npm run fn:deploy    # deploy Edge Functions
npm run deploy:web   # local shortcut: expo export --platform web + vercel --prod
```

## Why the frontend `src/` was not restructured

A mass reorg right before backend wiring would: break hundreds of imports, invalidate the wave
prompts (which target exact context files), and risk regressions — all for cosmetic gain. The
existing split (`components / context / data / navigation / screens / hooks / theme / dev`) is already
a clean feature/loosely-layered structure. The correct, low-risk move is what we did: **add** the
`src/lib` seam + `supabase/` backend + `scripts/`, and rewire context internals in place.

> Note: `npm run tsc` currently reports ~13 **pre-existing** errors in app screens/components (web-only
> style values like `cursor`/`100vw`/`delayPressIn` on native styles, plus two typos). These predate
> this scaffolding and overlap with the mobile-optimization audit — see
> [`../MOBILE-OPTIMIZATION-AUDIT.md`](../MOBILE-OPTIMIZATION-AUDIT.md).
