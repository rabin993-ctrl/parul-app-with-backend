# 01 — Backend Architecture

> **🔄 Retrofit note (current direction).** The locked plan is **Supabase (free tier)** + the
> **existing React Native / Expo** client — see [`07-7day-execution-plan.md`](07-7day-execution-plan.md).
> Concretely that maps the abstract design below as follows:
> - **Backend framework / API gateway** → Supabase (PostgREST auto-API + Postgres functions called as
>   RPC). The "modular monolith" modules become folders of migrations + Edge Functions, not a NestJS app.
> - **Auth** → Supabase Auth, **email/password + Google OAuth only**. Phone OTP is **deferred to Phase 2**.
> - **Authorization** → enforced as **Postgres Row-Level Security (RLS)** since the client talks to the
>   DB directly (this is the critical security surface — see doc 07 §7).
> - **Realtime gateway** → Supabase Realtime (Postgres changes / broadcast), not a custom WS process.
> - **Object storage** → Supabase Storage buckets. **Push** → **Expo Push** (free), not raw FCM.
> - **Payments (§6) and the entire Vet Consult flow are DEFERRED** — not built now; vet stays a gated
>   "coming soon" screen. Money, when later added, is **BDT (৳)** via bKash/Nagad, not Razorpay/UPI.
> - **Market is Bangladesh-first.** Recommended Supabase region: **ap-south-1 (Mumbai)** — nearest to BD.
>
> The sections below remain the conceptual reference; read them through this mapping.

> Stack-agnostic system design for Parul. The schema ([`02`](02-data-model.md)) and API
> ([`03`](03-api-reference.md)) work with any of the implementation paths below.

## 1. High-level topology

```
                         ┌──────────────────────────────┐
                         │        React Native (Expo) app           │
                         │  (iOS · Android · Web)        │
                         └───────┬───────────────┬──────┘
                                 │ HTTPS/REST     │ WSS (realtime)
                                 ▼                ▼
                     ┌───────────────────┐  ┌──────────────────┐
                     │   API Gateway     │  │ Realtime Gateway │
                     │  (REST, OpenAPI)  │  │  (WebSocket)     │
                     └─────────┬─────────┘  └────────┬─────────┘
                               │                     │
        ┌──────────────────────┼─────────────────────┼───────────────────┐
        ▼                      ▼                     ▼                    ▼
 ┌────────────┐        ┌──────────────┐      ┌──────────────┐    ┌──────────────┐
 │  App/Core  │        │  Auth/Identity│      │ Notification │    │  Payments    │
 │  services  │        │   service     │      │   service    │    │  service     │
 └─────┬──────┘        └──────┬───────┘      └──────┬───────┘    └──────┬───────┘
       │                      │                      │                   │
       ▼                      ▼                      ▼                   ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                         PostgreSQL (primary)                              │
 └──────────────────────────────────────────────────────────────────────────┘
       │                 │                    │                      │
       ▼                 ▼                    ▼                      ▼
   ┌────────┐      ┌───────────┐       ┌─────────────┐        ┌──────────┐
   │ Redis  │      │ Object    │       │   FCM       │        │ Razorpay │
   │ (cache,│      │ Storage   │       │  (push)     │        │ (UPI/    │
   │ pub/sub│      │ + CDN     │       │             │        │  card)   │
   └────────┘      └───────────┘       └─────────────┘        └──────────┘
```

The product is best built as a **modular monolith** (one deployable, clear internal module
boundaries) rather than microservices. Domains are coupled (a post links to a user, a companion, a
circle; an adoption record links a listing, two users, and a chat thread) so a single database with
transactions is far simpler than distributed services. Split out only the **Realtime Gateway** as a
separate process, because its scaling profile (many long-lived connections) differs from request/response.

## 2. Internal modules

Each maps to a domain in [`02-data-model.md`](02-data-model.md) and a section in
[`03-api-reference.md`](03-api-reference.md):

| Module | Responsibilities |
|--------|------------------|
| **identity** | Auth, sessions, users, handles, privacy settings, blocking, reviews, trust scoring |
| **companions** | Pet CRUD, traits/health, siblings, followers |
| **feed** | Posts, media, reactions, comments, saves, forwards, lost/found alerts |
| **community** | Groups, membership, join policies, admin settings, discussions, moderation |
| **circles** | Paw Circles, members/roles, group chat, pins, shared media, reports |
| **adoption** | Listings, requests, records, milestone timeline, endorsements |
| **rescue** | Cases, updates, followers |
| **messaging** | Threads, messages, read state, mute |
| **vet** | Vet directory, consult state machine, in-session chat |
| **payments** | Razorpay orders/webhooks, receipts, vet fee capture |
| **treats** | Wallet, allowance reset, gifting |
| **notifications** | Unified notification fan-out, push tokens, delivery |
| **media** | Upload sessions (presigned URLs), processing, CDN URLs |

## 3. Authentication & authorization

### Identity
- **Methods:** phone OTP (primary, India-first), email + password, and OAuth (Google/Apple).
- **Tokens:** short-lived JWT **access token** (~15 min) + rotating **refresh token** (~30 days,
  stored hashed, revocable). Access token carries `user_id` and a minimal scope claim.
- **Sessions table** tracks refresh tokens per device for "log out everywhere" and audit.

### Authorization
- Every request runs as a user; `me` = caller. No anonymous writes.
- **Resource ownership** checks (post author, listing poster, circle admin, etc.) enforced in the
  service layer.
- **Role checks** for groups/circles: `admin` vs `member` (see `community_members.role`,
  `circle_members.role`).
- **Privacy enforcement** at read time using `user_privacy_settings`:
  - `profile_visibility` / `post_visibility`: `everyone | circles | only_me`.
  - `message_policy`: `everyone | circles | none` — gates who may open a DM thread.
  - `discoverable`, `show_online`, `show_location`, `show_companions` filter fields/listings.
- **Blocking:** `blocked_users` is consulted on message send, profile view, and feed assembly; a
  block is mutual-invisible (neither sees the other's new content or can DM).

> If using **Supabase**, much of this maps to **Row-Level Security (RLS)** policies; if using
> **NestJS**, implement as guards + a policy layer. The rules are identical.

## 4. Realtime gateway

A dedicated WebSocket process handles everything live. Backed by **Redis pub/sub** so multiple
gateway instances stay in sync.

**Channels (subscriptions):**
- `user:{id}` — personal channel: notifications, badge counts, DM thread updates.
- `thread:{id}` — a 1:1 or adoption chat thread (messages, typing, read receipts).
- `circle:{id}` — Paw Circle group chat (messages, member joins, pins).
- `consult:{id}` — vet consultation session (messages, status transitions).
- `presence` — online/away status (respects `show_online`).

Full event payloads in [`04-realtime-and-notifications.md`](04-realtime-and-notifications.md).
Realtime is **additive**: every event has a REST equivalent so the client can cold-load and reconcile.

## 5. Media, CDN & bandwidth strategy

This section is **load-bearing for cost and scale**. A photo-heavy social feed will hit Supabase's
**egress (bandwidth) limit before any other free-tier ceiling** — every feed scroll downloads images.
The strategy below is what keeps the app cheap and survivable under early traction. Treat the CDN +
thumbnails as **required**, not optional.

### Storage & upload
- **Upload flow:** client uploads directly to **Supabase Storage** buckets (`avatars`, `post-media`,
  `adoption-media`, `rescue-media`, `circle-media`) and references the returned path/URL when creating
  the post, update, message, gallery, etc. Large blobs never pass through app/API code.
- **Types:** images everywhere; **video** (adoption home updates, rescue updates) is stored and played
  as the **original** for now — **no transcoding** in the MVP (Supabase doesn't transcode; add
  Mux/Cloudflare Stream later if needed).
- The prototype's `images: number` / `photoCount` become real `media_assets` rows.

### Thumbnails (generate small, serve small)
- **Generate a thumbnail + a feed-sized variant at upload time** in the upload helper / an Edge
  Function (e.g. ~200px thumb for grids/avatars, ~1080px for full view). Store derivatives alongside
  the original and record their URLs on the `media_assets` row.
- **The feed and grids must request the thumbnail, never the original.** This is the single biggest
  egress saver — full-res is fetched only on explicit full-screen view.
- Supabase Storage can also do **on-the-fly image transformations** (resize/quality via URL params) —
  usable as a fallback, but pre-generated derivatives + CDN caching are cheaper at scale.

### CDN in front of Storage (Cloudflare, free)
- Put **Cloudflare's free CDN** in front of Supabase Storage so images are **cached at the edge** and
  served to users **without re-billing Supabase egress** on every view. Map a custom domain
  (e.g. `cdn.parul.app`) → Supabase Storage origin; cache public image responses aggressively
  (long `Cache-Control`, immutable URLs keyed by media id).
- **Public buckets** (feed images, avatars) are served via the CDN. **Private content** (adoption
  update photos visible only to poster/adopter) uses **signed URLs** with short TTLs and is not
  edge-cached for unauthorized viewers.
- Net effect: the first viewer warms the cache; everyone after is served by Cloudflare, so Supabase
  egress stays low and the free tier lasts far longer.

### Why this matters (numbers)
- Free-tier egress is small (~5 GB/mo). Serving full-res images directly from Storage exhausts it in a
  few thousand sessions. **Thumbnails + Cloudflare CDN cut origin egress by ~10–20×**, turning the
  bandwidth wall into a non-issue for an early beta and smoothing the path to Pro.
- This is purely additive infra — same schema, same client URLs (just pointed at the CDN domain). No
  re-architecture when you scale.

## 6. Payments (Vet Consult)

The only paid flow is vet consultations. The app already models `card | wallet | upi`, a consult
fee, a flat **platform fee (₹49)**, and a `receiptId`.

**Flow (Razorpay):**
1. Client reaches `payment_pending` in the consult state machine.
2. `POST /vet/consultations/{id}/payment-intent` → backend creates a Razorpay **order** for
   `total_fee` (consult + platform), returns order id + key.
3. Client completes payment in the Razorpay SDK (UPI/card/wallet).
4. Razorpay **webhook** → backend verifies signature → marks `payment_completed`, generates
   `receipt_id`, advances consult to `session_ready`, emits realtime + notification.
5. Failures move the consult to `payment_failed` (client offers retry).

All amounts stored in **paise**. Webhooks are idempotent (keyed on Razorpay payment id). Never trust
client-reported success — only the webhook transitions state.

## 7. Notifications

A single **unified notification model** (one `notifications` table) backs the in-app inbox, which
the app already merges from multiple sources (adoption, social, circle, system). See the type matrix
in [`04`](04-realtime-and-notifications.md).

- **Fan-out:** domain events (new comment, request received, adoption confirmed, milestone due,
  circle request, vet status) call the notification module, which writes a row and:
  - emits to `user:{id}` over WebSocket (live badge + inbox update), and
  - sends an **FCM push** if the recipient is offline / has push enabled.
- **Preferences:** the app exposes toggles for *Post activity* and *Adoption updates* — stored per
  user and checked before fan-out.
- **Push tokens** in `push_tokens` (per device, per platform).

## 8. Background jobs

A scheduler + worker (Redis-backed queue, e.g. BullMQ / Sidekiq / Celery-equivalent) handles:

| Job | Trigger | Purpose |
|-----|---------|---------|
| **Milestone sweep** | hourly | For confirmed `adoption_records`, compute `next_update_due_at`; create `update_request` notifications + prompts when due/overdue (week_1, month_1, month_3, month_6) |
| **Treat wallet reset** | on read or daily | Roll the 30-day period; refill `remaining` to `allowance` (100) |
| **Trust recompute** | on review/update | Recompute `profile_trust` and adopter trust badges |
| **Trending score** | every 15 min | Recompute `community_posts.trending_score` |
| **Vet match** | on urgent consult | Assign an available vet (`finding_vet` → `vet_assigned`) |
| **Media processing** | on upload | Thumbnails + transcode |
| **Push retries / cleanup** | as needed | Dead token pruning, delivery retries |

## 9. Moderation & safety

- **Reports:** generic `reports` table (target = user, post, community post, circle, message).
  Reasons mirror the app's circle report sheet (spam, harassment, inappropriate media, safety,
  other) plus a free-text detail.
- **Trust & flags:** `profile_trust.status` (`trusted | good | warning | flagged`) drives the
  Reviews & Safety screen and adopter badges. Flag count feeds the "under review" banner.
- **Community admin controls:** post approval queue, require-photo-for-lost/found, member removal,
  join approval — all backed by `community_*` tables.
- **Blocking & privacy** as in §3.

## 10. Cross-cutting concerns

- **API style:** REST + JSON, documented as **OpenAPI 3.1** (single source of truth; generates the
  React Native (Expo) client and a mock server). Cursor pagination. Standard error envelope (see [`03`](03-api-reference.md)).
- **Validation:** server-side schema validation on every write; enums enforced at the DB level.
- **Rate limiting:** per-user + per-IP (Redis token bucket); stricter on auth, posting, messaging.
- **Idempotency:** `Idempotency-Key` header on POSTs that create money or messages.
- **Observability:** structured logs, request tracing, metrics (latency, error rate, queue depth),
  Sentry for errors.
- **Config & secrets:** env-based; secrets in a vault/secret manager.
- **Testing:** unit (services), integration (DB), contract (OpenAPI), and load (chat + feed).
- **CI/CD:** migrations run on deploy; blue/green or rolling; DB migrations are forward-only and
  reviewed.

## 11. Environments

`local` → `staging` → `production`, each with isolated Postgres, storage bucket, Redis, and payment
keys (Razorpay test vs live). Seed scripts can load the prototype's sample data into `local`/`staging`
for parity with the current app.
