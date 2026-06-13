… PASTE EVERYTHING BELOW THIS LINE INTO CLAUDE CODE …

You are orchestrating **Wave 0 — Foundation & Auth** for the Parul app (Expo / React Native in this
repo) on **Supabase (free tier)**. Goal: a new user can sign up / sign in (email + Google), the DB
schema exists, storage buckets exist, and the app opens authenticated. We are KEEPING the existing
React Native UI and rewiring **context internals** only — do not change screens.

Read first: `docs/backend/02-data-model.md`, `docs/backend/05-rn-supabase-integration.md` (§2–3, §6),
`docs/backend/07-7day-execution-plan.md` (§2, §7), and `build-waves/README.md` (ground rules).
Confirm `PREREQUISITES.md` was completed (`.env` has `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY`, repo is
`supabase link`ed). If not, STOP and tell me which step is missing.

**Orchestration:** Run **Sub-agent A** and **Sub-agent B** in parallel FIRST. When A's migration is
applied, run **Sub-agent C** and **Sub-agent D** in parallel. Then integrate and verify.

---

**Sub-agent A — Apply the schema migration** *(migration pre-written)*
- ALREADY WRITTEN: `supabase/migrations/0001_init.sql` — all non-deferred enums + 50 tables +
  indexes; the `auth.users → public.users` **bootstrap trigger** (`handle_new_user`, which also seeds
  the user's `user_privacy_settings` + `treat_wallets` rows); the `profile_trust` view; and **RLS
  enabled (default-deny) on every table** with baseline identity policies. Deferred tables
  (`vets`, `vet_*`, `payments`, `auth_credentials`, `sessions`) are intentionally absent. Review it
  against `docs/backend/02-data-model.md`; do NOT rewrite from scratch.
- Run `npm run db:push`. If anything fails, fix the migration in place and re-push until clean.
  (`pg_cron` is intentionally left commented — it's enabled in Wave 3; don't enable here unless your
  tier allows `create extension pg_cron`.)
- Done when: `npm run db:push` succeeds and a fresh signup auto-creates the `users` + privacy +
  wallet rows (verify after Sub-agent C wires the profile).

**Sub-agent B — Verify client bootstrap + regenerate types** *(mostly scaffolded already)*
- ALREADY DONE (scaffolded, do NOT recreate): deps (`@supabase/supabase-js`,
  `react-native-url-polyfill`, async-storage) are installed; `src/lib/supabase.ts` (AsyncStorage
  session, url-polyfill), `src/lib/env.ts`, `src/lib/uploads.ts`, `src/lib/cdn.ts`, and the
  `gen:types` npm script all exist; `.env` holds the project URL + anon key.
- Verify the project is linked (`npx supabase projects list`) and the client imports cleanly.
- After Sub-agent A's migration applies, run `npm run gen:types` to replace the `src/lib/db-types.ts`
  placeholder (`type Database = any`) with the real generated types.
- Done when: `npm run gen:types` emits real types and `npm run tsc` is clean for `src/lib/*`.

**Sub-agent C — Connect auth to the profile (UI + gate already built)** *(after A applies)*
- ALREADY DONE (pre-Wave-0): `src/context/AuthContext.tsx` (email sign-up/in/out + session restore),
  `src/screens/auth/AuthScreen.tsx` (themed login/signup), and the auth gate in `App.tsx`. System
  theming is also done. DO NOT rebuild these — extend/connect them.
- ALSO DONE: the **`users` profile bootstrap trigger** ships in migration `0001` (creates the
  `users` row from `raw_user_meta_data` name on signup), and **Sign out** is already wired in Profile
  settings (`useAuth().signOut()`). Don't redo these.
- YOUR MAIN TASK: rewire `src/context/CurrentUserProfileContext.tsx` to read/write the **signed-in
  user's** `users` row (keep its exact public API; replace the mock `me`). Hydrate from the
  AuthContext session; reflect edits (bio/location) back to the `users` row.
- (Optional) Google OAuth via `expo-auth-session` / `expo-web-browser`. Phone OTP stays DEFERRED.
- Done when: sign up → a `users` row is created from the entered name → the app shows YOUR profile
  (not mock) → kill & reopen stays logged in → Sign out returns to the auth screen.

**Sub-agent D — Storage buckets + upload helper + storage RLS** *(after A applies)*
- Create buckets via migration or CLI: `avatars`, `post-media`, `adoption-media`, `rescue-media`,
  `circle-media` (public read for feed/avatars; the rest with signed-URL access).
- Add `src/lib/uploads.ts`: a helper that uploads a local file to a bucket and returns a
  `media_assets` row + URL (doc 05 §6).
- Add storage RLS so users can only write under their own `{userId}/...` path.
- Done when: a smoke upload to `avatars` succeeds and returns a public URL.

---

**Integrate & verify (you, the orchestrator):**
1. `npm run gen:types` to refresh `src/lib/db-types.ts`.
2. `npx tsc --noEmit` clean; `npm start` boots.
3. Manually (or via the `/verify` skill): create **two** test accounts; confirm both can sign in,
   sessions persist, and each gets its own `users` row. Confirm a logged-out client cannot read
   `users` rows it shouldn't (RLS baseline).
4. Report: what was built, migration filename, any deviations, and the exit-check result. Then STOP
   so I can `/code-review` and commit before Wave 1.

**Guardrails:** match context APIs exactly; don't touch screens beyond the minimal auth gate; RLS
default-deny; DB enums = frontend unions; stop and ask before anything costing money or touching
DEFERRED features (Vet, payments, phone OTP).
