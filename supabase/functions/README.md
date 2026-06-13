# functions/ — Edge Functions (Deno)

Server-side logic that can't be expressed as pure SQL/RLS. Each function is a folder with an
`index.ts`. Shared helpers live in `_shared/`. Run locally: `npm run fn:serve`. Deploy:
`npm run fn:deploy`.

Planned functions (authored in their waves):

| Function | Wave | Purpose |
|----------|------|---------|
| `milestone-sweep/` | 3 | pg_cron-invoked: move confirmed adoptions to `update_due`, create milestone notifications |
| `notify/` | 5 | central notification fan-out (insert row + Expo push), respecting prefs/mutes/blocks |
| `treat-give/` | 6 | (optional) enforce treat-wallet rules if not done as a Postgres function |
| `media-thumbnail/` | 7 | (optional) generate _sm/_md image variants on upload |

Secrets (service-role key, Expo token, etc.) are set with `supabase secrets set ...` — never hardcode
and never expose to the client. `_shared/` holds the admin client + CORS helper.
