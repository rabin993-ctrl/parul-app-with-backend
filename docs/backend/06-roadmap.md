# 06 — Build Roadmap

> **🔄 Superseded by [`07-7day-execution-plan.md`](07-7day-execution-plan.md).** This was the original
> multi-week, multi-engineer roadmap drafted before the stack was locked, so it still mentions
> NestJS / OpenAPI mock servers / Razorpay-era ideas. The **actual** plan is the RN + Supabase 7-day
> wave plan in doc 07. Kept here for the phase/dependency reasoning only — don't follow it literally.

> Sequenced delivery plan for the Parul backend + React Native (Expo) client. Phases are ordered by dependency
> and product value. Effort is rough (engineer-weeks for a small team: ~2 backend + 2 RN); treat
> as relative sizing, not commitments.

## Dependency map

```
Phase 0 Foundations
        │
        ▼
Phase 1 Identity + Social core ──────────────┐
        │                                     │
        ▼                                     ▼
Phase 2 Adoption + Rescue            Phase 3 Realtime + Circles
        │                                     │
        └──────────────┬──────────────────────┘
                        ▼
              Phase 4 Community + Moderation
                        │
                        ▼
              Phase 5 Vet + Payments + Treats
                        │
                        ▼
              Phase 6 Hardening / Scale
```

Phases 2 and 3 can run in parallel once Phase 1 lands (different developers, minimal overlap).

---

## Phase 0 — Foundations & decisions  ·  ~1–2 wks

**Goal:** unblock parallel work with a locked stack and a frozen contract.

- Resolve the [open decisions](README.md#open-decisions-to-confirm): backend framework (Supabase fast
  path vs NestJS control path), payments provider, auth methods, media limits, region.
- Provision Postgres, object storage + CDN, Redis, CI/CD, environments (`local/staging/prod`).
- Apply the schema from [`02`](02-data-model.md) as the initial migration; load prototype seed data.
- Author the **OpenAPI 3.1** spec from [`03`](03-api-reference.md); stand up a **mock server** so
  the RN client work starts immediately.
- Scaffold the React Native (Expo) app shell ([`05`](05-rn-supabase-integration.md) §1–3): 5-tab navigation, theme,
  auth token plumbing, generated API client.

**Exit:** migrations run cleanly; mock server serves the contract; RN app shell builds with tabs +
theme.

---

## Phase 1 — Identity + Social core (MVP-1)  ·  ~3–4 wks

**Goal:** the app feels alive — sign in, profiles, pets, and a working feed.

- **Auth & identity:** OTP/email/OAuth, sessions, `/me`, profile edit, privacy settings, blocking,
  reviews + derived trust.
- **Companions:** CRUD, from-adoption add, follow, companion profile.
- **Media:** presigned upload flow + processing.
- **Feed:** posts (text/media), tags, paw reactions, threaded comments, saves, forwards, lost/found
  alerts; profile Posts/Activity/Saved.
- **Notifications (REST):** unified inbox + read state (push wired in Phase 3).

**Exit:** a user can sign up, set up a profile + pet, post, react, comment, save, and see
notifications. **Demoable product.**

---

## Phase 2 — Adoption + Rescue (MVP-2)  ·  ~3–4 wks

**Goal:** Parul's core purpose.

- **Adoption:** listings (create/edit/browse/search/save), requests (submit/approve/reject/cancel,
  poster inbox), records (propose/confirm), the **milestone care timeline** + the background
  **milestone sweep** job, home updates, endorsements, mark-adopted/relist.
- **Rescue:** open case, updates timeline, follow/help, status progression, search.
- **Notifications:** adoption + rescue types fan-out.
- RN: adoption hub (Browse/My listings/Chats), flip cards, detail, create/edit/manage, care
  profile; rescue hub + case detail.

**Exit:** full adoption journey works end-to-end (browse → request → approve → confirm → milestone
updates → endorsement); rescue cases can be opened, updated, followed.

> Adoption **chat** depends on Phase 3; until then, requests/approvals work via REST and the thread
> opens once messaging ships. Sequence Phase 3 right after (or parallel to) Phase 2 for the complete
> loop.

---

## Phase 3 — Realtime messaging + Paw Circles  ·  ~3–4 wks

**Goal:** live communication.

- **Realtime gateway:** WebSocket + Redis pub/sub, auth, presence, reconnect ([`04`](04-realtime-and-notifications.md)).
- **Messaging:** threads (DM + adoption-linked), messages, read state, mute, report; adoption panel
  actions surfaced in-thread.
- **Paw Circles:** create/explore/join, members + roles, join requests, group chat, pins, shared
  media, mute, report, admin (edit/remove/delete/transfer).
- **Push:** FCM integration, token registration, deep-linked notifications.

**Exit:** real-time 1:1 + circle chat; adoption chats fully connected; push notifications land and
deep-link.

---

## Phase 4 — Community Groups + moderation  ·  ~2–3 wks

**Goal:** topic communities and the safety surface.

- **Communities:** discover/join, group pages, discussions (create/preview/publish), helpful votes,
  comments, saves, search.
- **Admin:** identity/topics/joining/posting/privacy/guidelines settings, pending requests, member
  removal, post-approval queue.
- **Moderation:** reports queue + triage, flag→trust pipeline, "under review" states.

**Exit:** users create and run groups; reports are actionable; trust/safety reflects flags.

---

## Phase 5 — Vet Consult + Payments + Treats  ·  ~3–4 wks

**Goal:** the monetized + gamified surfaces.

- **Vet:** directory, issue categories, the **consult state machine**, urgent matching job, browse,
  in-session chat (`consult:{id}`), history, receipts.
- **Payments:** Razorpay orders + **webhook-driven** state transitions, idempotency, refunds,
  receipts (UPI/card/wallet).
- **Treats:** wallet with 30-day allowance reset job, gifting rules (own_pet/empty/debounce),
  received counts, profile toggle.

**Exit:** a user can request a vet, pay (UPI/card/wallet), consult, and get a receipt; treats can be
gifted and shown on profiles.

---

## Phase 6 — Hardening & scale  ·  ongoing

- **Search:** move hot search bars to OpenSearch/Meilisearch if Postgres FTS isn't enough.
- **Performance:** denormalized counters/caches for feed + community; query tuning; CDN coverage.
- **Abuse & limits:** rate limiting, spam heuristics, content filtering, audit logs.
- **Observability:** dashboards (latency, error rate, queue depth, WS connections), alerting, SLOs.
- **Load testing:** feed assembly + chat fan-out at target concurrency.
- **Compliance:** data export/delete (account deletion), privacy review, payment reconciliation.

---

## MVP cut line

The **smallest launchable product** is **Phases 0–2 + the messaging slice of Phase 3** — i.e.,
identity, social feed, the full adoption + rescue loop, and 1:1 chat (so adopters and posters can
actually coordinate). Circles, communities, vet/payments, and treats are fast-follows.

| Bundle | Phases | Outcome |
|--------|--------|---------|
| **Internal demo** | 0–1 | Profiles + social feed |
| **Closed beta (MVP)** | 0–2 + DM chat | End-to-end adoption + rescue with coordination |
| **Public launch** | + 3–4 | Circles, communities, push, moderation |
| **Full product** | + 5–6 | Vet, payments, treats, hardened at scale |

---

## Risks & watch-items

- **Realtime scaling** — long-lived WS connections; isolate the gateway and load-test early (Phase 3).
- **Milestone correctness** — the adoption care timeline depends on a reliable scheduled job; build
  it with idempotent sweeps and good test coverage (Phase 2).
- **Payments integrity** — never transition consult/payment state from the client; only the verified
  webhook (Phase 5). Reconcile daily.
- **Privacy/blocking** — must be enforced consistently across feed, search, messaging, and
  notifications; centralize the policy layer (Phase 1) and reuse it everywhere.
- **Contract drift** — keep OpenAPI as the single source of truth; regenerate the React Native (Expo) client in
  CI so client/server can't silently diverge.
