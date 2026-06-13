… PASTE EVERYTHING BELOW THIS LINE INTO CLAUDE CODE …

You are orchestrating **Wave 7 — Hardening, RLS Audit & Live Deploy** for Parul. Prior waves are
committed. Goal: prove the app is safe (RLS audit), seed it so it's not empty, gate DEFERRED features,
and **deploy the web build live on my DigitalOcean droplet** with HTTPS. This is the launch gate.

Read first: `docs/backend/07-7day-execution-plan.md` (§7 security, §10 launch checklist),
`docs/backend/05-flutter-integration.md` (§9 deploy), `docs/backend/01-architecture.md` (§5 Media,
CDN & bandwidth — required), `build-waves/PREREQUISITES.md` (§7 droplet). Confirm the droplet IP,
domain, a Cloudflare account, and that DNS is delegated/ready; if not, STOP and ask me.

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

**Sub-agent C — Web build + droplet deploy** *(after A, B)*
- Build: `npx expo export -p web` → `dist/`.
- Deploy to the droplet over SSH: copy `dist/` to `/var/www/parul`; write `/etc/caddy/Caddyfile`:
  ```
  <your-domain> {
    root * /var/www/parul
    encode gzip
    try_files {path} /index.html
    file_server
  }
  ```
  then `systemctl reload caddy`. Caddy provisions HTTPS automatically.
- Ensure the app's `.env` Supabase URL/anon key are baked into the web build; add the droplet domain to
  Supabase Auth `additional_redirect_urls`.
- Add a `pg_cron` daily keep-alive (`select 1`) so the free project doesn't pause; wire Sentry DSN if
  provided.
- Provide a one-command redeploy script `scripts/deploy-web.sh`.
- Done when: `https://<your-domain>` serves the app over HTTPS and talks to Supabase.

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
