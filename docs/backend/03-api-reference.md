# 03 — REST API Reference

> **🔄 Retrofit note (current direction).** With **Supabase**, you usually **don't hand-write these
> REST routes** — the client uses `supabase-js` to query tables directly (guarded by RLS) and calls
> **Postgres functions via `supabase.rpc()`** for multi-step operations. Treat this document as the
> **behavior contract**: each route below = a query or RPC the rewired context must perform.
> - **Simple CRUD/list** (feed, listings, companions, comments, saves) → direct `supabase.from(...)`
>   select/insert/update with RLS.
> - **Multi-step / atomic** (approve request → open thread; confirm adoption → seed milestone;
>   give treat; helpful toggle with counts) → a **Postgres function** called as RPC.
> - **Auth routes** → handled by **Supabase Auth** (`supabase.auth.signUp / signInWithPassword /
>   signInWithOAuth`); **phone OTP routes are DEFERRED (Phase 2)**.
> - **Vet (`/vet/*`) and payment (`/webhooks/razorpay`, payment-intent) endpoints are DEFERRED** — not
>   built now.
> - **Push:** device registration goes to a `push_tokens` table; delivery uses **Expo Push**, not FCM.
>
> The grouping, fields, and status flows below are authoritative for behavior regardless of transport.

> The HTTP contract for Parul. Endpoints are grouped by domain and map directly to the schema
> ([`02`](02-data-model.md)) and the feature surface in [`/FEATURES.md`](../../FEATURES.md). Realtime
> events (chat, live notifications) are in [`04`](04-realtime-and-notifications.md). This is the
> source for the **OpenAPI 3.1** spec that generates the React Native (Expo) client.

## Conventions

- **Base URL:** `https://api.parul.app/v1`
- **Auth:** `Authorization: Bearer <access_token>` on every endpoint except `/auth/*`.
- **Content type:** `application/json`. File bytes go to object storage via presigned URLs, never to the API.
- **`me`** refers to the authenticated user. Many endpoints use `/me/...`.
- **Pagination:** cursor-based. Request `?limit=20&cursor=<opaque>`; response includes
  `{ "data": [...], "next_cursor": "<opaque>|null" }`.
- **Timestamps:** ISO-8601 UTC. Client renders relative strings.
- **IDs:** opaque strings (UUIDs).
- **Idempotency:** send `Idempotency-Key: <uuid>` on payment + message POSTs.

### Standard error envelope

```json
{ "error": { "code": "forbidden", "message": "You can't edit this listing.", "details": {} } }
```

Common codes: `unauthenticated` (401), `forbidden` (403), `not_found` (404),
`validation_error` (422), `rate_limited` (429), `conflict` (409), `payment_required` (402),
`server_error` (500).

---

## Auth & session

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/auth/otp/request` | Send phone OTP `{ phone }` |
| `POST` | `/auth/otp/verify` | Verify `{ phone, code }` → tokens (+ creates user if new) |
| `POST` | `/auth/register` | Email signup `{ name, handle, email, password }` |
| `POST` | `/auth/login` | Email login `{ email, password }` → tokens |
| `POST` | `/auth/oauth/:provider` | OAuth exchange `{ id_token }` (google/apple) |
| `POST` | `/auth/refresh` | `{ refresh_token }` → new access (+ rotated refresh) |
| `POST` | `/auth/logout` | Revoke current session |
| `GET`  | `/auth/handle-available?handle=` | Handle availability check |

**Token response:** `{ access_token, refresh_token, expires_in, user: {…} }`.

---

## Users & profiles

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/me` | Current user + privacy + trust + impact stats |
| `PATCH`| `/me` | Update `{ bio?, location?, name?, website? }` (Settings → About You) |
| `GET`  | `/users/:id` | Public profile (respects privacy/blocking) |
| `GET`  | `/users/:id/posts` | A user's feed posts (Profile → Posts) |
| `GET`  | `/users/:id/companions` | A user's companions |
| `GET`  | `/users/:id/reviews` | Reviews on a profile (Reviews & Safety) |
| `POST` | `/users/:id/reviews` | Leave a review `{ rating, body }` |
| `GET`  | `/me/activity` | Comments I've left (Profile → Activity) |
| `GET`  | `/me/saved?type=feed_post\|community_post` | Saved items |
| `GET`  | `/me/impact` | `{ rescues, rehomed, adopted, postsCount, adoptionsCount }` |
| `GET`  | `/me/trust` | `{ rating, reviewCount, flagCount, status }` + adopter badge |

### Privacy & blocking (Profile → Privacy / Blocked users)

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/me/privacy` | Current privacy settings + notification toggles |
| `PATCH`| `/me/privacy` | Update any of `profile_visibility, post_visibility, message_policy, discoverable, show_online, show_location, show_companions, notify_post_activity, notify_adoption_updates, show_treats_on_profile` |
| `GET`  | `/me/blocked` | Blocked users list |
| `POST` | `/me/blocked` | Block `{ user_id }` |
| `DELETE`| `/me/blocked/:userId` | Unblock |

---

## Companions

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/me/companions` | My pets |
| `POST` | `/companions` | Add `{ name, species, age?, ... }` (manual) |
| `POST` | `/companions/from-adoption` | Add from a confirmed adoption `{ record_id }` |
| `GET`  | `/companions/:id` | Full companion profile (stats, treats, siblings, posts) |
| `PATCH`| `/companions/:id` | Edit |
| `DELETE`| `/companions/:id` | Remove from profile |
| `GET`  | `/companions/:id/posts` | Companion's tagged posts |
| `GET`  | `/companions/:id/treats` | Recent treat gifters (Recent Love) |
| `POST` | `/companions/:id/follow` / `DELETE` | Follow / unfollow |

---

## Media uploads

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/media/uploads` | Request presigned URL `{ type, mime, bytes }` → `{ media_id, upload_url, fields }` |
| `POST` | `/media/:id/complete` | Mark upload done; triggers processing |

Reference returned `media_id`(s) when creating posts/updates/messages/galleries.

---

## Feed

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/feed?circle_id=&tag=&scope=nearby\|all&cursor=` | Main feed; filter by circle, tag (`lost-found,discussion,meme`), nearby |
| `POST` | `/posts` | Create post (body below) |
| `GET`  | `/posts/:id` | Single post + counts |
| `PATCH`| `/posts/:id` | Edit own post |
| `DELETE`| `/posts/:id` | Delete own post |
| `POST` | `/posts/:id/paw` / `DELETE` | React / unreact (paw) |
| `POST` | `/posts/:id/save` / `DELETE` | Save / unsave |
| `POST` | `/posts/:id/forward` | Forward `{ destinations: [{type:'feed'}\|{type:'community', id}] }` |
| `GET`  | `/posts/:id/comments` | Threaded comments |
| `POST` | `/posts/:id/comments` | Comment `{ text, parent_id?, mentions?[] }` |
| `POST` | `/comments/:id/paw` / `DELETE` | React to a comment |

**Create post body:**
```json
{
  "text": "string",
  "tag": "discussion|adoption|lost-found|rescue|paw-posting",
  "label": "string|null",
  "media_ids": ["..."],
  "companion_ids": ["..."],
  "companion_author_id": "id|null",
  "circle_id": "id|null",
  "location": "string|null",
  "alert": { "kind": "lost|found", "area": "...", "last_seen": "...", "found_at": "...", "looks_like": "...", "phone": "..." }
}
```

---

## Community (Groups)

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/communities?discover=true` | Discover groups |
| `GET`  | `/me/communities` | My joined groups |
| `POST` | `/communities` | Create group |
| `GET`  | `/communities/:id` | Group detail + my role |
| `PATCH`| `/communities/:id` | Admin settings (identity, topics, joining, posting, privacy, guidelines) |
| `POST` | `/communities/:id/join` | Join (open) or create join request (request/invite) |
| `DELETE`| `/communities/:id/membership` | Leave |
| `GET`  | `/communities/:id/members` | Members |
| `DELETE`| `/communities/:id/members/:userId` | Remove member (admin) |
| `GET`  | `/communities/:id/requests` | Pending join requests (admin) |
| `POST` | `/communities/:id/requests/:reqId/approve` \| `/deny` | Decide request |
| `GET`  | `/community-feed?group_id=all&topics=` | Aggregated discussions across joined groups |
| `GET`  | `/communities/:id/posts` | One group's posts |
| `POST` | `/communities/:id/posts` | Create discussion `{ title, body, category, composer_label?, alert_meta?, image_media_id? }` |
| `GET`  | `/community-posts/:id` | Post detail |
| `POST` | `/community-posts/:id/helpful` / `DELETE` | Helpful vote |
| `POST` | `/community-posts/:id/save` / `DELETE` | Save (via saved_items) |
| `GET`  | `/community-posts/:id/comments` | Comments |
| `POST` | `/community-posts/:id/comments` | Comment `{ text, parent_id? }` |
| `GET`  | `/community-search?q=&group_id=&topics=` | Search discussions |

---

## Paw Circles

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/me/circles` | Circles I created/joined |
| `GET`  | `/circles/explore?q=&filter=all\|popular\|nearby` | Explore |
| `POST` | `/circles` | Create `{ name, location?, privacy }` |
| `GET`  | `/circles/:id` | Circle detail + my membership |
| `PATCH`| `/circles/:id` | Edit name/location/privacy/bio (admin) |
| `DELETE`| `/circles/:id` | Delete (creator) |
| `POST` | `/circles/:id/join` | Join (open) / request (request) |
| `DELETE`| `/circles/:id/membership` | Leave |
| `GET`  | `/circles/:id/members?sort=alpha\|date` | Members |
| `DELETE`| `/circles/:id/members/:userId` | Remove (admin) |
| `GET`  | `/circles/:id/requests` | Join requests (admin) |
| `POST` | `/circles/:id/requests/:reqId/approve` \| `/deny` | Decide |
| `POST` | `/circles/:id/requests/accept-all` | Accept all |
| `GET`  | `/circles/:id/messages?cursor=` | Chat history |
| `POST` | `/circles/:id/messages` | Send `{ type:'text', text }` or `{ type:'shared_post', post_id }` |
| `GET`  | `/circles/:id/pins` | Pinned messages |
| `POST` | `/circles/:id/messages/:msgId/pin` / `DELETE` | Pin / unpin |
| `GET`  | `/circles/:id/media` | Shared media (photos + files) |
| `PATCH`| `/circles/:id/membership` | Mute/unmute `{ muted }`, mark read `{ last_read_at }` |
| `POST` | `/circles/:id/report` | Report `{ reason, details? }` |

---

## Adoption

### Browse & listings

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/adoptions?species=&status=&age_group=&gender=&urgency=&vaccinated=&location=` | Browse (Browse tab filters) |
| `GET`  | `/adoptions/search?q=` | Search by name/breed/location |
| `GET`  | `/adoptions/:id` | Listing detail |
| `POST` | `/adoptions` | Create listing (full body from create form) |
| `PATCH`| `/adoptions/:id` | Edit listing |
| `POST` | `/adoptions/:id/save` / `DELETE` | Save / unsave |
| `POST` | `/adoptions/:id/mark-adopted` | `{ note? }` → status `Adopted` |
| `POST` | `/adoptions/:id/relist` | Re-list (after closed) |
| `GET`  | `/me/adoptions/listings` | My listings + request counts (My listings tab) |

### Requests (adopter ↔ poster)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/adoptions/:id/requests` | Send adoption request `{ message }` → Confirmation screen |
| `DELETE`| `/adoption-requests/:id` | Cancel my request |
| `GET`  | `/adoptions/:id/requests` | Poster inbox ("Interested in {pet}") |
| `POST` | `/adoption-requests/:id/approve` | Approve → opens chat thread |
| `POST` | `/adoption-requests/:id/reject` | Reject |
| `GET`  | `/me/adoptions/outgoing` | My sent requests (Adopting segment) |

### Records, milestones & endorsements

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/adoptions/:id/records` | Propose/confirm adoption (creates record `pending_confirmation`) |
| `POST` | `/adoption-records/:id/confirm` | Confirm (→ `confirmed`, seeds first milestone) |
| `GET`  | `/adoption-records/:id` | Care profile + timeline + updates |
| `GET`  | `/me/adoptions/records?role=adopter\|poster` | Adopted / placements |
| `POST` | `/adoption-records/:id/updates` | Post home update `{ text?, media_ids?, has_video?, milestone_id? }` |
| `POST` | `/adoption-records/:id/endorse` | Poster endorse `{ recommendation: 'recommended'\|'not_recommended', text? }` |
| `POST` | `/adoption-records/:id/respond` | Adopter responds to feedback `{ text }` |
| `GET`  | `/me/adoptions/prompts` | Due/overdue milestone prompts |

---

## Rescue

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/rescues?scope=nearby\|all&type=cases\|rescue\|all&species=&status=` | Discover (filters) |
| `GET`  | `/rescues/search?q=` | Search by name/location/case ID |
| `GET`  | `/me/rescues/following` | Following tab |
| `GET`  | `/me/rescues/cases` | My Cases tab |
| `POST` | `/rescues` | Open a case (full form) |
| `GET`  | `/rescues/:id` | Case detail + updates timeline |
| `POST` | `/rescues/:id/updates` | Post update `{ text?, media_ids?, has_video? }` |
| `POST` | `/rescues/:id/follow` / `DELETE` | Follow / unfollow |
| `POST` | `/rescues/:id/help` | "I can help" → notifies poster |
| `PATCH`| `/rescues/:id` | Update status (Active/Under treatment/Recovered) |

---

## Messages (1:1 + adoption-linked)

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/threads?type=dm\|adoption` | Thread list (Messages screen) |
| `POST` | `/threads` | Start a DM `{ user_id }` (gated by message_policy + blocking) |
| `GET`  | `/threads/:id` | Thread header + adoption panel context |
| `GET`  | `/threads/:id/messages?cursor=` | Messages |
| `POST` | `/threads/:id/messages` | Send `{ text, media_ids? }` |
| `POST` | `/threads/:id/read` | Mark read `{ last_read_message_id }` |
| `PATCH`| `/threads/:id` | Mute/unmute `{ muted }` |
| `POST` | `/threads/:id/report` | Report peer `{ reason, details? }` |

> Adoption-thread actions ("Mark as adopted", "Post update", "Relist") reuse the **Adoption**
> endpoints above; the thread's `adoption_panel` payload tells the client which buttons to show.

---

## Vet Consult

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/vet/issues` | Issue categories (static) |
| `GET`  | `/vet/vets?q=&available=true` | Browse vets |
| `GET`  | `/vet/vets/:id` | Vet profile |
| `POST` | `/vet/consultations` | Start consult `{ mode, issue_id, pet_id, symptoms, media_ids?, vet_id? }` |
| `GET`  | `/me/vet/consultations?state=active\|recent` | Active + recent |
| `GET`  | `/vet/consultations/:id` | Consult + status + messages |
| `POST` | `/vet/consultations/:id/payment-intent` | Create Razorpay order `{ method }` → `{ order_id, key, amount }` |
| `POST` | `/vet/consultations/:id/messages` | In-session chat `{ text }` |
| `POST` | `/vet/consultations/:id/start` | Start session (`session_ready`→`active`) |
| `POST` | `/vet/consultations/:id/end` | End (`active`→`completed`) |
| `POST` | `/vet/consultations/:id/cancel` | Cancel |
| `GET`  | `/vet/consultations/:id/receipt` | Receipt |
| `POST` | `/webhooks/razorpay` | **Server-to-server** payment webhook (no auth; signature-verified) |

**Consult status flow:** `finding_vet → vet_assigned → payment_pending → payment_completed →
session_ready → active → completed` (plus `cancelled`, `payment_failed`). The server owns all
transitions; payment ones come only from the verified webhook.

---

## Treats

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/me/treats/wallet` | `{ remaining, allowance, period_start_at, resets_in_days }` |
| `POST` | `/companions/:id/treats` | Give a treat → `{ ok, remaining }` or `{ ok:false, reason }` (`empty\|own_pet\|not_ready\|debounce\|unknown_pet`) |
| `GET`  | `/me/treats/received` | Treats received across my companions |

---

## Notifications

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/me/notifications?filter=all\|unread\|adoption\|circles\|posts&cursor=` | Unified inbox |
| `GET`  | `/me/notifications/unread-count` | Badge count |
| `POST` | `/me/notifications/read-all` | Mark all read |
| `POST` | `/me/notifications/:id/read` | Mark one read |
| `DELETE`| `/me/notifications/:id` | Dismiss (adoption notifications) |
| `POST` | `/me/notifications/:id/circle-request` | Inline circle request `{ action: 'accept'\|'ignore' }` |
| `POST` | `/me/push-tokens` | Register device `{ platform, token }` |
| `DELETE`| `/me/push-tokens/:token` | Unregister |

---

## Reports (generic)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/reports` | `{ target_type, target_id, reason, details? }` — used by post/user/circle/message report flows |

---

## Search (cross-domain)

Each surface has its own search bar; the dedicated endpoints above (`/adoptions/search`,
`/rescues/search`, `/community-search`, `/circles/explore?q=`) cover them. A future global
`/search?q=&types=` can federate once OpenSearch is introduced (see [`01`](01-architecture.md) §10).
