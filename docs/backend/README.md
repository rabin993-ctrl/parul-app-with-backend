# Parul — Backend & Platform Design

This folder is the backend + integration plan for **Parul**, a social pet-adoption platform. The repo
is an Expo / **React Native** app (currently with mock data) that we are wiring to **Supabase**.

These documents are derived directly from the app's real data models (the TypeScript
`type`/`interface` definitions in `src/context/*` and `src/data/*`) and the documented feature surface
in [`/FEATURES.md`](../../FEATURES.md). Field names, enums, and status lifecycles match the app so the
React Native client can be wired up without guesswork.

> **Direction — locked.** Ship on the **existing React Native / Expo app** (no Flutter). Backend =
> **Supabase, free tier ($0)**. Auth = **email + Google OAuth** (**phone OTP → Phase 2**).
> **Payments + Vet Consult are deferred** (vet stays a gated "coming soon" screen). Realtime =
> **Supabase Realtime**; push = **Expo Push**; media = **Supabase Storage + Cloudflare CDN**. Market =
> **Bangladesh-first** (৳ BDT). The authoritative, step-by-step plan is
> [`07-7day-execution-plan.md`](07-7day-execution-plan.md).

## Documents

| # | File | What it covers |
|---|------|----------------|
| 0 | **README.md** (this file) | Scope, the locked stack, and how the docs fit together |
| 1 | [`01-architecture.md`](01-architecture.md) | System architecture — read its retrofit banner (Supabase mapping) |
| 2 | [`02-data-model.md`](02-data-model.md) | Full PostgreSQL schema (DDL), enums, indexes, ERD — applied as Supabase migrations |
| 3 | [`03-api-reference.md`](03-api-reference.md) | Per-domain operation contract (becomes Supabase queries/RPC) |
| 4 | [`04-realtime-and-notifications.md`](04-realtime-and-notifications.md) | Realtime channels/events + the unified notification system |
| 5 | [`05-rn-supabase-integration.md`](05-rn-supabase-integration.md) | React Native + Supabase client integration guide |
| 6 | [`06-roadmap.md`](06-roadmap.md) | Original phased roadmap (superseded by doc 07; kept for reference) |
| 7 | [`07-7day-execution-plan.md`](07-7day-execution-plan.md) | ⭐ **Authoritative plan** — wire the RN app to Supabase in 7 days |
| 8 | [`08-project-structure.md`](08-project-structure.md) | Repo layout: frontend + `src/lib` seam + `supabase/` backend |

> Docs 01–04 were drafted stack-agnostic (with a Flutter/India-era flavour) and each carries a
> **🔄 Retrofit note** at the top mapping it to the locked Supabase/RN/Expo reality. Their schema, API,
> and realtime *content* remains correct; read them through those banners. Doc 07 is the single source
> of truth for what we're actually building and in what order.

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
9. **Vet Consult** — *deferred* (gated "coming soon"); no payments built now.
10. **Treats** — periodic allowance wallet, peer-to-peer gifting to companions.
11. **Notifications** — one unified inbox across adoption, social, circle, and system events.

## The stack (locked)

| Concern | Choice | Notes |
|---------|--------|-------|
| **Frontend** | **Existing React Native / Expo app** | Rewire context internals to Supabase; screens stay frozen |
| **Backend** | **Supabase (free tier)** | Postgres + Auth + Storage + Realtime + Edge Functions + pg_cron |
| **Database** | **PostgreSQL** (managed by Supabase) | Schema = doc 02, applied as `supabase/migrations/*` |
| **Authorization** | **Row-Level Security** | The client talks to Postgres directly — RLS is the auth layer (doc 07 §7) |
| **Auth** | **Email/password + Google OAuth** | **Phone OTP deferred → Phase 2** |
| **Realtime** | **Supabase Realtime** | Chat, circles, live notifications/presence |
| **Storage + media** | **Supabase Storage + Cloudflare CDN** | Thumbnails + edge caching to spare egress (arch §5) |
| **Push** | **Expo Push** | Free; deep-links via `entity_type`/`entity_id` |
| **Payments** | **Deferred** | No bKash/Nagad/cards now (vet is "coming soon") |
| **Search** | **Postgres full-text** | Covers the MVP search bars; fuzzy/OpenSearch later |
| **Market / money** | **Bangladesh-first; ৳ BDT** | Money (when later built) stored in poisha |

> Why Supabase: it covers DB + auth + realtime + storage + scheduled jobs + light logic (Edge
> Functions) — i.e. the whole backend for an app this shape — and the build + early beta run at **$0**.
> The few things it doesn't do alone (Expo Push for delivery; later: payments, video transcoding,
> fuzzy search) are noted where relevant. See doc 07 §4 for free-tier limits and the upgrade trigger.

## Build plan

The authoritative, day-by-day plan is **[`07-7day-execution-plan.md`](07-7day-execution-plan.md)**;
the paste-ready Claude Code prompts are in **[`../../build-waves/`](../../build-waves/)**. In short:

- **Wave 0** — Supabase project, schema migration, **email auth** (login/signup UI + gate already
  built), storage buckets, client bootstrap.
- **Wave 1** — identity, privacy, blocking, reviews, companions.
- **Wave 2** — feed (posts, reactions, **threaded comments + replies**, saves, forwards, media).
- **Wave 3** — adoption (listings → requests → records → milestone sweep → endorsements).
- **Wave 4** — rescue + 1:1/adoption messaging + Supabase Realtime.
- **Wave 5** — unified notifications + Expo push.
- **Wave 6** — Paw Circles + Community + Treats *(stretch)*.
- **Wave 7** — RLS audit, seed, gate Vet, deploy web to the droplet + Cloudflare CDN.
- **Wave 8** — mobile polish (independent of the backend).

## Conventions used across these docs

- **IDs:** UUID (time-sortable) as primary keys. The prototype's string IDs (`ar-*`, `req-*`, `t-*`)
  become UUIDs, exposed as opaque strings to the client.
- **Timestamps:** `timestamptz` (UTC) everywhere. The prototype's display strings ("Just now",
  "2 days ago") are computed **client-side** from real timestamps.
- **Soft deletes:** user-generated content uses `deleted_at` rather than hard deletes (moderation, audit).
- **Money:** deferred (no payments now). When built, **BDT** stored in integer **poisha**.
- **Enums:** Postgres native `enum` types mirror the frontend string-literal unions exactly.
- **Auth context:** every request runs as an authenticated user (`me` = the caller); RLS enforces access.

## Decisions (locked) & still-open knobs

**Locked:** RN/Expo frontend · Supabase free tier · email + Google auth (OTP → Phase 2) · payments &
vet deferred · Supabase Realtime · Expo Push · Supabase Storage + Cloudflare CDN · Bangladesh-first / BDT.

**Still to confirm (don't block Wave 0):**
1. **Media limits** — max photo/video sizes; do rescue/adoption updates need video transcoding (Storage holds video; no transcoding on free)?
2. **Google OAuth** — enable at launch, or email-only first and add Google in a fast-follow?
3. **Production email** — keep confirmations off for beta, or wire an SMTP provider before public launch?
