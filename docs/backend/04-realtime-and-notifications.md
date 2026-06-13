# 04 — Realtime & Notifications

> **🔄 Retrofit note (current direction).** Implemented with **Supabase Realtime + Expo Push**, not a
> custom WebSocket gateway or FCM:
> - **Channels/events below** map to **Supabase Realtime** — subscribe to Postgres change feeds
>   (`supabase.channel(...).on('postgres_changes', ...)`) on `messages`, `circle_messages`,
>   `notifications`, and to **broadcast** for ephemeral signals (typing/presence). No Redis to run.
> - **Authorization** of subscriptions is enforced by **RLS** (you only receive rows you may read).
> - **Notifications** use the single `notifications` table + the type matrix below; fan-out runs in a
>   **Supabase Edge Function** (service role) triggered by DB events.
> - **Push** is **Expo Push** (free): store device tokens in `push_tokens`, send via Expo's API,
>   deep-link with `entity_type`/`entity_id`.
> - **`vet_status` events are DEFERRED** (vet flow not built).
>
> The event catalogue and notification matrix are authoritative; just read "WebSocket gateway" as
> "Supabase Realtime" and "FCM" as "Expo Push".

> WebSocket contract for live features and the unified notification system. Every realtime event has
> a REST equivalent ([`03`](03-api-reference.md)) so the React Native (Expo) client can cold-load then reconcile
> with the live stream.

## 1. Connection

- **Endpoint:** `wss://api.parul.app/v1/realtime`
- **Auth:** connect with `?token=<access_token>` (or send an `auth` frame immediately after open).
  The gateway validates the JWT, binds the socket to `user:{id}`, and rejects on expiry.
- **Heartbeat:** ping/pong every ~25s; client reconnects with exponential backoff and resubscribes.
- **Scaling:** multiple gateway instances share state via **Redis pub/sub**; a publish on any node
  reaches every subscriber.

### Frame shape

```json
{ "type": "message.created", "channel": "thread:abc", "data": { ... }, "ts": "2026-06-13T10:00:00Z" }
```

Client → server frames: `subscribe`, `unsubscribe`, `typing`, `read`, `ping`.
Server → client frames: the event types in §3.

## 2. Channels

| Channel | Who subscribes | Carries |
|---------|----------------|---------|
| `user:{id}` | the user (auto on connect) | notifications, unread badge, thread list bumps, presence of contacts |
| `thread:{id}` | the two participants | DM / adoption-thread messages, typing, read receipts, adoption-panel changes |
| `circle:{id}` | circle members | circle messages, system joins, pins, member changes |
| `consult:{id}` | the user (+ assigned vet) | vet chat messages, consult status transitions |
| `presence` | opt-in | online/away (honors `show_online`) |

Authorization is enforced on `subscribe`: you can only join threads/circles/consults you belong to.

## 3. Event catalogue

### Messaging (`thread:{id}` + `user:{id}`)
| Event | Data |
|-------|------|
| `message.created` | full message `{ id, thread_id, kind, sender_user_id, text, media, created_at }` |
| `message.read` | `{ thread_id, user_id, last_read_message_id }` |
| `typing` | `{ thread_id, user_id }` (ephemeral, not stored) |
| `thread.updated` | `{ thread_id, preview, unread, adoption_panel }` (bumps Messages list) |
| `adoption_panel.updated` | `{ thread_id, state, actions:[...] }` (e.g. after Mark-as-adopted) |

### Paw Circles (`circle:{id}`)
| Event | Data |
|-------|------|
| `circle.message.created` | `{ id, circle_id, type, sender_user_id?, text?, shared_post_id?, created_at }` |
| `circle.system` | `{ circle_id, text }` ("{member} joined the circle") |
| `circle.pin.changed` | `{ circle_id, message_id, pinned }` |
| `circle.member.changed` | `{ circle_id, user_id, action: 'joined'|'left'|'removed'|'role' }` |
| `circle.request.created` | `{ circle_id }` → admins refresh requests |

### Vet consult (`consult:{id}`)
| Event | Data |
|-------|------|
| `consult.status` | `{ consult_id, status }` (drives the 7-step tracker) |
| `consult.message.created` | `{ consult_id, sender, text, created_at }` |
| `consult.vet_assigned` | `{ consult_id, vet }` |
| `consult.receipt` | `{ consult_id, receipt_id }` |

### Notifications & presence (`user:{id}`, `presence`)
| Event | Data |
|-------|------|
| `notification.created` | full notification row (see §4) |
| `notification.badge` | `{ unread_count }` |
| `presence.changed` | `{ user_id, online }` |

## 4. Unified notifications

The app's Notifications screen merges adoption, social, circle, and system events into one inbox
with filter tabs **All / Unread / Adoption / Circles / Posts**. The backend models this as a single
`notifications` table ([`02`](02-data-model.md) §14) with a `type`, optional `actor_user_id`,
an `entity_type`/`entity_id`, and a flexible `data` JSONB.

### Type matrix

| `type` | Filter tab | Trigger | `data` payload | Tap target |
|--------|-----------|---------|----------------|-----------|
| `like` | Posts | someone paws your post/companion post | `{ post_id }` | post |
| `comment` | Posts | comment on your post | `{ post_id, comment_id }` | post + comment sheet |
| `mention` | Posts | @mentioned in a post/comment | `{ post_id, comment_id? }` | post |
| `lost` | Posts | lost-pet alert nearby | `{ post_id, area }` | lost/found post |
| `circle_request` | Circles | join request to your circle | `{ circle_id, request_id }` | inline Accept/Ignore |
| `circle_accept` | Circles | your request accepted | `{ circle_id }` | circle chat |
| `request_received` | Adoption | someone requested your listing | `{ listing_id, request_id }` | poster inbox |
| `approved` | Adoption | your request approved | `{ listing_id, request_id, thread_id }` | chat thread |
| `rejected` | Adoption | your request rejected | `{ listing_id }` | listing |
| `adopted` | Adoption | listing marked adopted | `{ listing_id, record_id }` | adopted detail |
| `update_request` | Adoption | milestone update due | `{ record_id, milestone_id, pet_name }` | adopted detail (post update) |
| `adoption_confirmed` | Adoption | adoption confirmed | `{ record_id, pet_name }` | adopted detail |
| `endorsement_received` | Adoption | poster endorsed you | `{ record_id }` | adopted detail |
| `rescue_help` | Posts | someone offered help on your case | `{ case_id }` | rescue case |
| `vet_status` | — | consult status change (push only) | `{ consult_id, status }` | consult |

> The frontend prototype splits these across `AdoptionNotification`, `AdoptionFeedNotification`, and
> `AppNotification`. They unify cleanly here: the `data` JSONB preserves every field
> (`milestoneId`, `requestId`, `petName`, `recordId`, etc.), and the filter tabs map to a `type`→tab
> lookup the client already encodes.

### Fan-out pipeline

```
domain event ──► notifications.create(row)
                      │
                      ├─► insert into notifications
                      ├─► publish notification.created + notification.badge to user:{id} (live)
                      └─► if recipient offline / push enabled and not muted:
                              send FCM push (title, body, deep-link data)
```

Preferences gate fan-out: `notify_post_activity` covers `like/comment/mention`,
`notify_adoption_updates` covers the adoption set. Muted circles suppress `circle_*`. Blocked users
never generate notifications for each other.

### Delivery & dedupe

- **Idempotency:** notification creation is keyed on `(type, entity_id, actor_user_id, recipient_id)`
  within a short window to avoid duplicates (e.g. rapid double-paw).
- **Badge:** `unread_count` is recomputed and pushed on every create/read.
- **Deep links:** push `data` carries `entity_type` + `entity_id` so the app routes straight to the
  target screen on tap.

## 5. Client reconciliation strategy

1. On screen open, **REST** loads the current state (thread messages, notifications, etc.).
2. **Subscribe** to the relevant channel(s).
3. Apply live events optimistically; if a gap is detected (missed sequence after reconnect),
   re-fetch via REST and replace.
4. Outgoing messages use an **`Idempotency-Key`**; the echoed `message.created` reconciles the
   optimistic local copy.
