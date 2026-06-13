… PASTE EVERYTHING BELOW THIS LINE INTO CLAUDE CODE …

You are orchestrating **Wave 7 — Hardening, RLS Audit & Live Deploy** for Parul. Prior waves are
committed. Goal: prove the app is safe (RLS audit), seed it so it's not empty, gate DEFERRED features,
and **deploy the web build live on Vercel via GitHub CI/CD**. This is the launch gate.

Read first: `docs/backend/07-7day-execution-plan.md` (§7 security, §10 launch checklist),
`docs/backend/05-rn-supabase-integration.md` (§9 deploy), `docs/backend/01-architecture.md` (§5 Media,
CDN & bandwidth — required), `build-waves/PREREQUISITES.md` (§7 Vercel). Confirm the Vercel project
is linked to the GitHub repo and the two Supabase env vars are set in Vercel → Settings → Environment
Variables; if not, STOP and ask me.

**Orchestration:** run **A (RLS audit)** and **B (seed + gating)** in parallel; then **C (build +
deploy)** and **E (CDN + thumbnails)** in parallel after both; **D (smoke test)** last against the
live URL.

---

**Sub-agent A — RLS security audit (HARD GATE)**
- Enumerate every table; verify RLS is ENABLED with explicit policies (default-deny). For each domain,
  write a scripted "attacker account B" test proving B **cannot** read or write A's private data:
  private posts, DMs/threads, adoption records + updates, others' privacy/blocked lists, others'
  notifications, non-member circle/community content. Fix any gap found.
- Verify privileged operations only run via service-role Edge Functions, never the anon client.
- Produce `docs/backend/RLS-AUDIT.md` listing each table, its policies, and the attacker-test result.
- Done when: every attacker test is DENIED and the audit file is green.

**Sub-agent B — Seed data + gate DEFERRED + dead-button sweep**
- Write `supabase/seed.sql` from `src/data/*` so a fresh DB has believable users, companions, posts,
  listings, rescue cases, circles, communities (Dhaka/Bangladesh context). Provide a load command.
- Gate **Vet Consult** to its existing "coming soon" state; ensure no button in the app hits an
  unimplemented backend (sweep for dead handlers; route DEFERRED features to ComingSoonModal).
- Confirm currency strings: app is BDT (৳); the only ₹/UPI references live in the gated vet flow — leave
  them, since vet is not shipping.
- Done when: a freshly seeded project shows populated screens and no dead/erroring buttons.

**Sub-agent C — Web build + Vercel deploy via GitHub CI/CD** *(after A, B)*
- Add `vercel.json` at the repo root:
  ```json
  {
    "buildCommand": "npx expo export --platform web",
    "outputDirectory": "dist",
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```
- Add `.github/workflows/deploy-web.yml`:
  ```yaml
  name: Deploy Web
  on:
    push:
      branches: [main]
    workflow_dispatch:
  jobs:
    deploy:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'npm'
        - run: npm ci
        - name: Build web
          env:
            EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.EXPO_PUBLIC_SUPABASE_URL }}
            EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY }}
          run: npx expo export --platform web
        - name: Deploy to Vercel
          run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
          env:
            VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
            VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
  ```
- Update `scripts/deploy-web.sh` to be a local convenience wrapper:
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail
  echo "==> Building web bundle…"
  npx expo export --platform web
  echo "==> Deploying to Vercel (production)…"
  npx vercel --prod
  echo "==> Done. Check https://vercel.com/dashboard for the live URL."
  ```
- Ensure the live domain is added to Supabase Auth → URL Configuration → Additional Redirect URLs.
- Add a `pg_cron` daily keep-alive (`select 1`) so the free project doesn't pause; wire Sentry DSN if
  provided.
- Done when: a push to `main` triggers the GitHub Action, the build passes, and
  `https://<vercel-domain>` serves the app over HTTPS and talks to Supabase.

**Sub-agent E — CDN + thumbnails (bandwidth survival)** *(after A, B; parallel with C)*
- **Thumbnails:** update the upload helper (`src/lib/uploads.ts`) and/or an Edge Function so every
  image upload also produces a **~200px thumbnail** and a **~1080px** variant, stored alongside the
  original with their URLs recorded on the `media_assets` row. Backfill a thumbnail for any seed media.
- **Serve small:** make the feed, grids, avatars, and chat previews request the **thumbnail**, never
  the original; full-res loads only on explicit full-screen view. (Touch the rendering helpers, not
  screen layouts.)
- **Cloudflare CDN:** put Cloudflare's **free** CDN in front of Supabase Storage — map a custom
  domain (e.g. `cdn.<your-domain>`) to the Storage origin, cache public image responses aggressively
  (long, immutable `Cache-Control` keyed by media id). Route **public** bucket image URLs through the
  CDN domain; keep **private** content (adoption update photos) on **short-TTL signed URLs**, not
  edge-cached. Add a small URL helper so the app builds CDN URLs from media ids.
- Follow `docs/backend/01-architecture.md` §5 exactly.
- Done when: a feed scroll serves thumbnails from the **Cloudflare edge** (verify `cf-cache-status:
  HIT` after warm-up), Supabase origin egress drops sharply on repeat views, and private images still
  require a signed URL.

**Sub-agent D — Live smoke test + launch checklist** *(last)*
- Against the live URL, run the doc 07 §10 checklist end-to-end: sign up → add pet → post → list a pet
  → request → approve → confirm → chat → receive notification. Document results in
  `docs/backend/LAUNCH-CHECKLIST.md`.
- Done when: the full loop passes on the live site from a clean account.

---

**Integrate & verify:** report the live URL, the RLS audit result, seed status, and the smoke-test
checklist. STOP for my `/code-review` + final commit/tag (`v0.1.0-beta`).

**Guardrails:** the RLS audit is a HARD GATE — do not declare launch-ready if any attacker test
passes. Don't enable email confirmations without an SMTP provider configured (would lock testers out).
Stop-and-ask before anything that costs money or exposes the service-role key. Vet/payments/phone-OTP
stay DEFERRED.
