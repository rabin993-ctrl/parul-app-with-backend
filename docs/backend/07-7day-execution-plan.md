# 07 — The 7-Day Execution Plan (React Native + Supabase, $0)

> How to wire the **existing Expo / React Native app** in this repo to a real backend on
> **Supabase's free tier**, using **Claude Code** to do the work, and reach a **launchable beta** in
> 7 days. Bangladesh-first. No payments, no vet, no phone OTP yet (all deferred). Client integration
> details are in [`05-rn-supabase-integration.md`](05-rn-supabase-integration.md).

---

## 0. Honest framing — what "7 days" actually delivers

A real billion-dollar company is not built in 7 days, and this plan won't claim otherwise. What 7
focused days of Claude-Code-driven work **can** deliver:

- A **working, installable beta** of the core product (auth → profile → feed → adoption → rescue →
  1:1 chat → notifications), backed by a **real database, real auth, real media, real realtime**,
  running at **$0** on free infrastructure.
- The architectural foundation a venture-scale product is built on (RLS security model, migrations,
  realtime, push), so the next 7 weeks compound instead of restart.

Everything below is scoped to be **true and achievable**, not aspirational. Where something can't
realistically land in 7 days, it's marked **Stretch** or **Deferred** — not promised.

---

## 1. Locked decisions (from you)

| Decision | Choice | Consequence in this plan |
|----------|--------|--------------------------|
| Frontend | **Keep the Expo/RN app** | We swap the data layer, not the UI. The 5-tab app already exists. |
| Backend | **Supabase, free tier only** | Postgres + Auth + Storage + Realtime + Edge Functions + pg_cron, all $0. |
| Payments | **Not now** | No Razorpay/bKash. Removed from critical path. |
| Vet Consult | **Coming soon (gated)** | Keep the UI, show the existing "coming soon" state, no backend. |
| Phone OTP | **Phase 2** | Launch auth = email/password + Google OAuth. |
| Market | **Bangladesh-first → global** | ৳ BDT; ₹/UPI only exist in the gated vet flow, so no rework now. |

---

## 2. The core strategy: swap the context internals, keep the UI

The single most important idea that makes 7 days feasible.

The app already has a clean data layer: **React Context providers** (`src/context/*`) that hold mock
data (from `src/data/*`, persisted in AsyncStorage) and expose hooks the screens consume. We do
**not** touch screens. We **reimplement each context's internals** to call Supabase while keeping its
**exact public API** (same hook names, same returned shapes, same functions like `submitRequest`,
`giveTreat`, `toggleFollow`).

```
BEFORE:  Screen ──uses──► useAdoptionFeed() ──reads──► in-memory mock + AsyncStorage
AFTER:   Screen ──uses──► useAdoptionFeed() ──reads──► Supabase (Postgres + Realtime)
                 (unchanged)        (same API surface)        (new internals)
```

Benefits: screens stay frozen (low risk), contexts become the integration seam, and we can migrate
**one domain at a time** with the app runnable the whole way. The `DevResetContext` /
`seedSnapshots` can stay for local fallback during migration.

---

## 3. Target architecture (RN ↔ Supabase)

```
┌───────────────────────────────────────────────┐
│   Expo / React Native app (this repo)          │
│   screens (unchanged) → contexts (rewired)     │
│   supabase-js client + Expo modules            │
└───────────┬───────────────────────┬───────────┘
            │ HTTPS (PostgREST/RPC)  │ WSS (Supabase Realtime)
            ▼                        ▼
┌───────────────────────────────────────────────┐
│                  SUPABASE (free tier)          │
│  Auth (email + Google OAuth)                   │
│  Postgres  ── RLS policies (privacy/ownership) │
│  Storage   ── media buckets (avatars/posts/…)  │
│  Realtime  ── chat, circles, notifications     │
│  Edge Functions + pg_cron ── jobs & logic      │
└───────────────────────────────────────────────┘
            │
            ▼
   Expo Push (free) ── notifications
```

- **Reads/writes:** mostly via `supabase-js` directly against tables (PostgREST), guarded by **RLS**.
  Complex/atomic operations use **Postgres functions** called as RPC (`supabase.rpc(...)`).
- **Security moves to the database.** Because the client talks to Postgres directly, **Row-Level
  Security is the authorization layer** — this is the most important and most error-prone work; §7
  is dedicated to it.
- **Logic that can't be RLS/SQL** (milestone sweep, notification fan-out, treat rules, trust
  recompute) lives in **Edge Functions** + **pg_cron** schedules — all on free tier.

---

## 4. Does it really fit the free tier? Yes — with these limits

| Resource | Free tier | Enough for build + beta? |
|----------|-----------|--------------------------|
| Database | 500 MB Postgres | Yes — text + IDs are tiny; media lives in Storage, not the DB |
| Storage | 1 GB files | Yes for beta; watch video (defer adoption/rescue video to Stretch) |
| Auth | 50,000 monthly active users | Far beyond an early beta |
| Realtime | ~200 concurrent connections, 2M messages/mo | Fine for beta chat/notifications |
| Edge Functions | 500k invocations/mo | Plenty for jobs + fan-out |
| pg_cron | included | Milestone sweep, treat reset, keep-alive |
| Egress | 5 GB/mo | Use a thumbnail/CDN strategy; fine for beta |

**The one caveat:** free projects **pause after ~7 days of inactivity**. During the 7-day sprint this
never triggers; for the beta, normal usage (or a tiny daily `pg_cron` keep-alive) prevents it.
**Upgrade trigger:** when you cross storage/egress/connection limits → Supabase **Pro ~$25/mo**. Until
then it's genuinely **$0**. (If you ever want zero vendor lock, the same schema self-hosts on a VPS,
but that costs more than free Supabase, so free Supabase is the cheapest path today.)

---

## 5. Repo & workflow layout

Add the backend to this repo (or a `supabase/` subfolder) so Claude Code edits both client and
backend in one place:

```
parul-app/
  src/                      # existing Expo app (screens unchanged, contexts rewired)
  supabase/
    migrations/             # SQL migrations (schema from doc 02, BD-adapted)
    functions/              # Edge Functions (milestone-sweep, notify, treats, trust)
    seed.sql                # seed data mirroring src/data/* for parity
    config.toml             # supabase CLI config
  src/lib/
    supabase.ts             # configured client (AsyncStorage session, URL polyfill)
    db-types.ts             # generated types (supabase gen types typescript)
  docs/backend/             # these design docs
```

- **Branch:** do the migration on a `feature/backend-wiring` branch; merge per-domain as each goes green.
- **Source of truth:** [`02-data-model.md`](02-data-model.md) for schema, [`03-api-reference.md`](03-api-reference.md)
  for operations (translate REST routes → Supabase queries/RPC), [`04`](04-realtime-and-notifications.md)
  for realtime/notifications, [`/FEATURES.md`](../../FEATURES.md) for behavior.

---

## 6. The day-by-day plan

Each day lists **tasks**, the **deliverable**, and an **exit check** (run the app, see it work).
Scope is split **MVP** (must ship) vs **Stretch** (only if ahead). The MVP core loop is Days 1–5 +
notifications; Stretch is Circles/Community/Treats.

### Day 1 — Foundations & auth ⟶ *you can log in*
- Create Supabase project (free), install Supabase CLI, init `supabase/`.
- Apply schema from [`02`](02-data-model.md) as the first migration, **adapted**: drop/skip
  `payments`, `vet_*` tables (Deferred); currency notes → BDT; keep everything else.
- Configure **Auth**: email/password + **Google OAuth**. Disable phone for now.
- Add `supabase-js` to the app with **AsyncStorage** session persistence + `react-native-url-polyfill`.
- Build the **auth gate**: sign up / sign in / sign out screens (or wire existing entry), session
  restore on launch, `CurrentUserProfileContext` backed by `users` row creation on first login.
- Generate DB types (`db-types.ts`).
- **Exit:** a new user signs up, a `users` row is created, the app opens to the feed authenticated;
  refresh keeps the session.

### Day 2 — Identity, profile, companions, privacy ⟶ *your profile is real*
- Rewire `CurrentUserProfileContext` (bio/location edit → `users`), `UserPrivacyContext`
  (`user_privacy_settings`, blocking), reviews + derived trust view.
- Rewire `CompanionContext`: companions CRUD, from-adoption add, followers.
- **Storage:** create buckets (`avatars`, `post-media`, `adoption-media`, `rescue-media`,
  `circle-media`); presigned upload helper; wire avatar/companion images.
- First **RLS pass** for these tables (see §7).
- **Exit:** edit profile, add a companion with a photo, set privacy, block/unblock — all persist and
  survive reinstall.

### Day 3 — Feed ⟶ *the app feels alive*
- Rewire `FeedPostContext`: posts (text + media), `post_tag`, lost/found alerts, reactions (paw),
  threaded comments, saves, forwards.
- Media upload from the composer; render from Storage URLs.
- Counts via SQL aggregates (or denormalized counters via triggers if needed for smoothness).
- RLS for posts/comments/reactions honoring `post_visibility` + blocking.
- **Exit:** create a post with a photo, paw/comment/save it from a second account, see counts update.

### Day 4 — Adoption (the core) ⟶ *the reason Parul exists*
- Rewire `AdoptionFeedContext` (listings: create/edit/browse/search/save; requests:
  submit/approve/reject/cancel; poster inbox) and `AdoptionContext` (records, updates, endorsements).
- **Postgres functions (RPC)** for the multi-step transitions: approve-request (opens thread),
  confirm-adoption (seeds first milestone), post-update, relist.
- **pg_cron + Edge Function: milestone sweep** — computes `next_update_due_at`, moves records to
  `update_due`, generates `update_request` notifications (week_1/month_1/month_3/month_6).
- RLS so only poster/adopter see a record and its updates.
- **Exit:** full loop on two accounts: list → request → approve → confirm → milestone prompt appears
  → post home update → poster endorses.

### Day 5 — Rescue + Messaging + Realtime ⟶ *people can talk*
- Rewire `RescueFeedContext`: open case, updates timeline, follow/help, status progression, search.
- **Messaging:** threads (DM + adoption-linked), messages, read state, mute, report. Gate DM
  creation by `message_policy` + blocking.
- **Supabase Realtime:** subscribe to message inserts per thread; live thread list + unread.
- **Exit:** open a rescue case and post an update; two accounts hold a live 1:1 chat; an approved
  adoption opens its thread and messages flow in real time.

### Day 6 — Notifications + push, then Stretch ⟶ *it pulls you back*
- **Unified notifications** (`notifications` table) + the type matrix from [`04`](04-realtime-and-notifications.md);
  rewire `NotificationsScreen` (filters All/Unread/Adoption/Circles/Posts, mark-all-read, dismiss,
  inline circle Accept/Ignore).
- **Notification fan-out** Edge Function on key events + **Expo Push** (free): register device tokens
  (`push_tokens`), deep-link on tap. Respect the notify toggles + mutes.
- **Stretch if ahead:** **Paw Circles** (create/join, group chat via Realtime, members, pins) and/or
  **Community groups** (discover/join, discussions, helpful, admin).
- **Exit:** an action on account A produces an in-app + push notification on account B that deep-links
  to the right screen.

### Day 7 — Hardening, seed, beta build ⟶ *shippable*
- **RLS audit** (§7): every table has policies; test the "evil second account" can't read/write
  others' private data. This is the gate to letting real users in.
- **Treats (Stretch):** wallet + gifting rules via RPC if time allows (no money involved).
- Seed realistic data (`seed.sql` from `src/data/*`) so the beta isn't empty.
- **Gate Deferred features** cleanly: Vet → existing "coming soon" UI; ensure no dead buttons.
- **Web deploy:** push to `main` → GitHub Actions → Vercel production; verify `https://parul.pet`.
- **Mobile build:** EAS build → **TestFlight (iOS) / Play internal testing (Android)**; smoke-test on
  real devices; basic error reporting (Sentry free tier).
- **Exit:** a tester installs from the store link OR opens the Vercel URL, signs up, and runs the core
  loop on a real device/browser.

---

## 7. Security plan — RLS is the whole ballgame

Because the RN client talks to Postgres directly, **Row-Level Security is the authorization layer**.
Getting this wrong = data leak. Getting it right = safe to onboard users. Non-negotiable rules:

- **Every table has RLS enabled** and explicit policies; default-deny.
- **Ownership writes:** users can only insert/update/delete rows they own (`author_user_id = auth.uid()`,
  listing poster, circle/community admin, etc.).
- **Privacy reads:** `posts`/profiles filtered by `post_visibility`/`profile_visibility`
  (`everyone | circles | only_me`) computed against the viewer.
- **Blocking:** a `blocked_users` check is baked into read policies and message-send so blocked pairs
  are mutually invisible and can't DM.
- **Messaging:** only thread participants can read a thread's messages; DM creation gated by
  `message_policy`.
- **Adoption records/updates:** visible only to that record's poster + adopter.
- **Privileged logic** that must bypass RLS (fan-out, sweeps) runs in **Edge Functions with the
  service role**, never the client.
- **Test harness:** a second "attacker" account in every domain's exit check that *should fail* to
  read/write — Claude Code verifies the denial, not just the happy path.

---

## 8. Scope ledger (so nothing is missed or hallucinated)

| Domain | Status | Notes |
|--------|--------|-------|
| Auth (email + Google) | **MVP** | No phone OTP (Phase 2) |
| Profile / privacy / blocking / reviews | **MVP** | |
| Companions | **MVP** | |
| Feed (post/react/comment/save/forward/alerts) | **MVP** | |
| Adoption (listings/requests/records/milestones/endorsements) | **MVP** | Core |
| Rescue (cases/updates/follow) | **MVP** | |
| Messaging (DM + adoption threads, realtime) | **MVP** | |
| Notifications (in-app + Expo push) | **MVP** | |
| Media upload (images) | **MVP** | Video = Stretch |
| Paw Circles (group chat) | **Stretch** | Day 6 if ahead |
| Community Groups | **Stretch** | Day 6–7 if ahead |
| Treats | **Stretch** | Day 7 if ahead; no money |
| **Vet Consult** | **Deferred — gated "coming soon"** | No backend now |
| **Payments (bKash/Nagad/cards)** | **Deferred** | Built with vet later |
| **Phone OTP** | **Deferred — Phase 2** | |
| Video transcoding, OpenSearch, multi-region | **Deferred** | Post-launch hardening |

---

## 9. How to drive Claude Code (operating procedure)

To "wire them properly using Claude Code entirely" without drift or hallucination:

1. **One domain per session, one context at a time.** Point Claude Code at the target context file +
   the matching schema/section in these docs. Small, verifiable units.
2. **Migrations first, then RLS, then rewire the context, then verify.** Never rewire a context
   before its tables + policies exist.
3. **Keep the app runnable.** After each domain, run the app (`npm start`) and use the relevant
   screen; the existing UI is the test harness. Use the **`/verify`** skill to confirm behavior.
4. **Two-account check** for anything privacy-sensitive (feed visibility, DMs, adoption records) —
   confirm the attacker account is denied.
5. **Review before merge.** Run **`/code-review`** on each domain's diff; fix findings; merge the
   domain branch.
6. **Guardrails against hallucination:** the contexts already define the exact function names and
   return shapes — Claude Code must match them, not invent. The schema enums must match the
   frontend's string-literal unions exactly (already aligned in [`02`](02-data-model.md)).
7. **Stop-and-ask triggers:** anything that would cost money, change the UI/UX, weaken an RLS policy,
   or touch a Deferred feature → confirm with you first.

---

## 10. Launch checklist (Day 7)

- [ ] All MVP domains green; two-account RLS checks pass.
- [ ] Seed data loaded; no empty screens.
- [ ] Deferred features gated (Vet "coming soon"; no dead buttons).
- [ ] Expo push works on a physical device; deep links route correctly.
- [ ] Web live on Vercel (`https://parul.pet`); GitHub CI/CD green on `main`.
- [ ] EAS build uploaded to TestFlight + Play internal testing.
- [ ] Sentry capturing errors; Supabase keep-alive cron set.
- [ ] A fresh tester completes: sign up → add pet → post → list a pet → request → approve → confirm →
      chat → notification. End to end, on a real phone.

---

## 11. Status of the earlier docs (retrofit — done)

Docs 01–06 were drafted before the stack was locked (a Flutter/Razorpay/India flavour). They have been
retrofitted to the current plan:

- **[`05-rn-supabase-integration.md`](05-rn-supabase-integration.md)** → **rewritten** as the React
  Native + Supabase client integration guide (renamed from the old Flutter filename). ✅
- **[`01-architecture.md`](01-architecture.md)–[`04`](04-realtime-and-notifications.md)** → each carries
  a **🔄 Retrofit note** mapping it to Supabase / RN / Expo Push; their schema/API/realtime content
  stays valid. ✅
- **[`02-data-model.md`](02-data-model.md)** → `payments` and `vet_*` tables marked **Deferred**;
  money is **BDT (poisha)** when later built. ✅
- **[`06-roadmap.md`](06-roadmap.md)** → marked **superseded** by this doc (kept for phase reasoning). ✅
- **[`README.md`](README.md)** → rewritten to the **locked stack** (RN + Supabase free tier, BD-first,
  deferrals). ✅

This doc (07) plus [`08-project-structure.md`](08-project-structure.md) are authoritative for what
we're building and in what order.

---

## 12. Honest risks & caveats

- **7 days is aggressive.** Days 1–5 (the core loop) are realistic with disciplined scope. Circles,
  Community, and Treats are genuinely **Stretch** — don't let them threaten the core. Better to ship
  the adoption loop polished than six features half-wired.
- **RLS is the make-or-break.** Budget real time for §7; a leak at launch is worse than a slipped
  feature. The Day-7 audit is a hard gate.
- **Free-tier ceilings & the inactivity pause** are real (§4) — fine for beta, plan the Pro upgrade
  before any growth push.
- **"Billion-dollar in 7 days" is a north star, not a deliverable.** What you get in 7 days is a
  credible, secure, $0 beta of the core product — the thing you then put in front of users, iterate,
  and raise on. That's the honest version, and it's a genuinely strong outcome.
```
