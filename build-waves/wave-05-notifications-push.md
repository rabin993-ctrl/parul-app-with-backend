… PASTE EVERYTHING BELOW THIS LINE INTO CLAUDE CODE …

You are orchestrating **Wave 5 — Notifications + Push** for Parul. Waves 0–4 are committed (notification
ROWS already created by feed/adoption/rescue/messaging). Goal: a unified in-app inbox + live delivery
+ **Expo push** with deep links. KEEP the UI; rewire **context internals** only.

Read first: `docs/backend/04-realtime-and-notifications.md` (full type matrix + fan-out),
`docs/backend/03-api-reference.md` (Notifications), `docs/backend/02-data-model.md` (§14),
`FEATURES.md` (Notifications screen: filters + inline circle Accept/Ignore).

**Orchestration:** run **A, B, C in parallel**; **D wires live delivery** after A and C.

---

**Sub-agent A — Notifications inbox + screen**
- Read/aggregate `notifications` for the current user with filter tabs **All / Unread / Adoption /
  Circles / Posts** (map `type` → tab per doc 04). Mark-one-read, mark-all-read, dismiss; unread
  badge count.
- Wire `NotificationsScreen` (no layout change), including the **inline circle request Accept/Ignore**
  buttons (call the circle request approve/deny — stubbed OK if Wave 6 not done; otherwise live).
- RLS: a user reads only their own notifications.
- Done when: the inbox shows real rows, filters work, mark-all-read clears the badge, dismiss removes
  an adoption notification.

**Sub-agent B — Fan-out Edge Function (centralize)**
- Create a Supabase Edge Function `notify` (service role) that other flows call (or a DB trigger
  invokes) to insert a notification + decide push. Centralize the per-type title/body + `data`
  payload from doc 04 §4. Respect `notify_post_activity` / `notify_adoption_updates`, muted circles,
  and `blocked_users`. Make creation idempotent on `(type, entity_id, actor, recipient)`.
- Refactor Wave 2–4 inline inserts to call this function.
- Done when: every event type produces exactly one correctly-shaped notification, gated by prefs.

**Sub-agent C — Expo push tokens + sender**
- Add `expo-notifications`; register device token on login → `push_tokens`; unregister on logout.
- Add a sender (in the `notify` function) that calls Expo Push API for offline/eligible recipients,
  with `data` carrying `entity_type`/`entity_id` for deep linking. Handle tap → route to the target
  screen (post, adoption record, thread, circle, rescue case).
- Done when: a physical device receives a push for a new notification and tapping it deep-links
  correctly.

**Sub-agent D — Live delivery** *(after A, C)*
- Subscribe the app to `notifications` inserts for the current user (`user:{id}` via Realtime) to
  update the inbox + badge live without refetch.
- Done when: an action on account A updates account B's badge + inbox instantly (foreground) and via
  push (background).

---

**Integrate & verify:** `npx tsc --noEmit` clean; `npm start` boots. Two-account check across types
(like/comment/mention, adoption request/approved/confirmed/update_request, rescue help): correct rows,
correct tab, live badge, and a real push on a device with a working deep link. RLS: can't read others'
notifications. Run `/verify`. Report and STOP for `/code-review` + commit.

**Guardrails:** unchanged UI; exact context APIs; prefs/mutes/blocking respected; idempotent fan-out;
`vet_status` notifications are DEFERRED (skip); stop-and-ask on cost/UX/security/DEFERRED.
