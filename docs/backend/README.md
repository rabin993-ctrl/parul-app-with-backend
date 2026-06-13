# Parul — Backend & Platform Design

This folder is the complete backend plan for **Parul**, a social pet-adoption platform. The
current repo is an Expo / React Native **frontend prototype** with all data mocked in-memory.
These documents define the production backend, database, and APIs needed to power a **Flutter**
rewrite of the same product, with the server stack still to be chosen.

Everything here is derived directly from the prototype's real data models (the TypeScript
`type`/`interface` definitions in `src/context/*` and `src/data/*`) and the documented feature
surface in [`/FEATURES.md`](../../FEATURES.md). Field names, enums, and status lifecycles match the
app so the Flutter client can be wired up without guesswork.

## Documents

| # | File | What it covers |
|---|------|----------------|
| 0 | **README.md** (this file) | The plan, scope, tech decision, and how the docs fit together |
| 1 | [`01-architecture.md`](01-architecture.md) | System architecture, services, auth, realtime, storage, payments, push, search, moderation |
| 2 | [`02-data-model.md`](02-data-model.md) | Full PostgreSQL schema (DDL), enums, indexes, and an ERD |
| 3 | [`03-api-reference.md`](03-api-reference.md) | REST API: every endpoint by domain, conventions, pagination, errors |
| 4 | [`04-realtime-and-notifications.md`](04-realtime-and-notifications.md) | WebSocket channels, event payloads, and the unified notification system |
| 5 | [`05-flutter-integration.md`](05-flutter-integration.md) | ⚠️ **Superseded** — Flutter guide; we now keep the React Native app. See doc 07. |
| 6 | [`06-roadmap.md`](06-roadmap.md) | Milestone plan, MVP cut line, sequencing, and effort estimates |
| 7 | [`07-7day-execution-plan.md`](07-7day-execution-plan.md) | ⭐ **Current plan** — wire the existing RN app to Supabase (free tier) in 7 days |

> **Direction update (locked with the team):** ship on the **existing React Native / Expo app** (not
> Flutter); backend = **Supabase free tier ($0)**; **payments + vet consult deferred** (vet gated
> "coming soon"); **phone OTP → Phase 2** (launch with email + Google OAuth); **Bangladesh-first**
> (৳ BDT). Docs 01–05 were written under the earlier Flutter/Razorpay/India assumption — **doc 07 is
> the authoritative plan**; docs 01–04 remain valid for schema/API/realtime behavior. See doc 07 §11
> for exact retrofits.

## Product scope (what the backend must support)

Eleven feature domains, all already designed in the frontend:

1. **Identity & Profile** — users, handles, bio/location, trust badges, reviews, privacy, blocking.
2. **Companions** — pet profiles, traits, health flags, siblings, treats received.
3. **Feed** — posts (text/media), tags, reactions ("paws"), threaded comments, saves, forwards, lost/found alerts.
4. **Community (Groups)** — topic groups, discussions, "helpful" votes, moderation, join policies.
5. **Paw Circles** — location-based group chat, members, roles, pinned messages, shared media.
6. **Adoption** — listings, requests, approval, adoption records, milestone care timeline, endorsements.
7. **Rescue** — followable cases with status progression and media updates.
8. **Messages** — 1:1 chat, including adoption-linked threads, mute/report/block.
9. **Vet Consult** — urgent matching or browse, payments, in-session chat, receipts.
10. **Treats** — periodic allowance wallet, peer-to-peer gifting to companions.
11. **Notifications** — one unified inbox across adoption, social, circle, and system events.

## The plan (high level)

**Phase 0 — Decisions & foundations.** Lock the stack (see below), stand up Postgres, auth, object
storage, and CI. Define the API contract (OpenAPI) and realtime contract first so Flutter and
backend can build in parallel against a mock server.

**Phase 1 — Identity + Social core (MVP-1).** Users, profiles, companions, feed (posts, reactions,
comments, saves), notifications, media uploads. This is the smallest thing that feels like the app.

**Phase 2 — Adoption + Rescue (MVP-2).** Listings, requests, adoption records, the milestone care
timeline, rescue cases. This is Parul's reason to exist; ship it second so the social shell is ready
to carry it.

**Phase 3 — Realtime messaging + Circles.** 1:1 chat, adoption-linked threads, Paw Circle group chat,
WebSocket gateway, presence, read state.

**Phase 4 — Community groups + moderation.** Group CRUD, join policies, admin settings, pending
requests, reports queue.

**Phase 5 — Vet Consult + Payments + Treats.** Vet matching, the consult state machine, payment
provider integration (UPI/card/wallet), receipts, treat wallet.

**Phase 6 — Hardening.** Search, rate limiting, abuse controls, analytics, observability, load test.

Full sequencing, dependencies, and the MVP cut line are in [`06-roadmap.md`](06-roadmap.md).

## Stack decision (recommended, not yet locked)

The backend is undecided, so the schema (pure PostgreSQL) and API (plain REST + WebSocket) are
written to be **stack-agnostic** — they work with any of the options below. We present a decision
matrix and a primary recommendation; the choice is yours and only affects [`01-architecture.md`](01-architecture.md).

| Concern | Recommended default | Why | Alternatives |
|---------|--------------------|-----|--------------|
| **Database** | **PostgreSQL 15+** | Relational data with rich relationships; JSONB for flexible bits; mature | — (firm recommendation) |
| **Backend framework** | **NestJS (TypeScript)** for a custom service, **or Supabase** for fastest MVP | NestJS gives structure + shares types with the existing TS models; Supabase gives Postgres+Auth+Realtime+Storage out of the box | Django/DRF, Go (Fiber/Echo), Rails |
| **Auth** | **OTP (phone) + email/password + OAuth**, JWT access + refresh | App is India-first (₹, UPI); phone-OTP is expected | Supabase Auth, Auth0, Firebase Auth |
| **Realtime** | **WebSocket gateway** (Socket.IO / native WS) backed by Redis pub/sub | Chat, circles, presence, live notifications | Supabase Realtime, Ably, Pusher |
| **Object storage** | **S3-compatible** (AWS S3 / Cloudflare R2) + CDN | Photos/video for posts, updates, galleries | Supabase Storage, GCS |
| **Payments** | **Razorpay** | Matches the app's `card / wallet / upi` methods exactly; India UPI support | Stripe (if going global), Cashfree |
| **Push** | **Firebase Cloud Messaging (FCM)** | Free, cross-platform, first-class Flutter support | APNs direct, OneSignal |
| **Search** | **Postgres full-text** first → **OpenSearch** later | Defer complexity; FTS covers MVP search bars | Meilisearch, Typesense |

> **Two concrete paths:**
> - **Fast path (Supabase):** Postgres + Auth + Realtime + Storage managed; write business logic in
>   Edge Functions; add Razorpay for vet payments. Fastest to MVP, least ops.
> - **Control path (NestJS + Postgres + Redis + S3):** Full control, easiest to scale and customize;
>   more infra to run. Recommended once the product is validated.
>
> The schema and API docs are identical either way. [`01-architecture.md`](01-architecture.md)
> documents both.

## Conventions used across these docs

- **IDs:** UUID v7 (time-sortable) as primary keys. The prototype uses string IDs (`ar-*`, `req-*`,
  `t-*`); production uses UUIDs and exposes them as opaque strings to the client.
- **Timestamps:** `timestamptz` (UTC) everywhere. The prototype's display strings ("Just now",
  "2 days ago") are computed **client-side** from real timestamps.
- **Soft deletes:** user-generated content uses `deleted_at` rather than hard deletes (moderation,
  audit).
- **Money:** integer **minor units** (paise). Vet fees in the app are whole ₹; stored as paise.
- **Enums:** Postgres native `enum` types mirror the frontend string-literal unions exactly.
- **Auth context:** every endpoint runs as an authenticated user; `me` = the caller.

## Open decisions to confirm

These don't block the schema/API but should be settled before/early in Phase 0:

1. **Backend framework** — Supabase fast path vs. NestJS control path.
2. **Payments provider** — Razorpay (assumed, India) vs. Stripe (global).
3. **Auth** — is phone-OTP required for launch, or email/OAuth only?
4. **Media** — max photo/video sizes; do rescue/adoption updates need video transcoding?
5. **Region / compliance** — single region (India) or multi-region from day one?
