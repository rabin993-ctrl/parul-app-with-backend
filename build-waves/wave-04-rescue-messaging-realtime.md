… PASTE EVERYTHING BELOW THIS LINE INTO CLAUDE CODE …

You are orchestrating **Wave 4 — Rescue + Messaging + Realtime** for Parul. Waves 0–3 are committed.
Goal: rescue cases work; 1:1 chat (incl. adoption-linked threads) works in **real time** via Supabase
Realtime, with read state, mute, and report. KEEP the UI; rewire **context internals** only.

Read first: `docs/backend/02-data-model.md` (§9 Rescue, §10 Messaging),
`docs/backend/03-api-reference.md` (Rescue, Messages), `docs/backend/04-realtime-and-notifications.md`
(Messaging events), `docs/backend/05-rn-supabase-integration.md` (§5 Realtime).

**Orchestration:** run **A (rescue)** and **B (messaging tables/RLS)** in parallel; then **C (realtime
wiring)** after B; **D (adoption thread panel)** after C. A is independent and can finish anytime.

---

**Sub-agent A — Rescue**
- Rewire `src/context/RescueFeedContext.tsx` to `rescue_cases` (+ `rescue_updates`,
  `rescue_update_media`, `rescue_case_followers`): open a case (locks story after posting), post
  updates (photos via bucket `rescue-media`), follow/unfollow, "I can help" (notifies poster),
  status progression (active/under_treatment/recovered), discover filters + search. Generate
  `case_code` (e.g. RC######).
- RLS: poster writes own case/updates; everyone reads cases; followers table per-user.
- Done when: open a case, post an update, follow it from a second account, change status — all persist;
  RescuesScreen + RescueCaseDetail render real data.

**Sub-agent B — Messaging tables, threads, RLS**
- Implement `threads` (dm + adoption), `thread_participants` (mute, last_read_message_id), `messages`
  (+ `message_media`). Functions: `start_dm(user_id)` (gated by `message_policy` + `blocked_users`),
  send message, mark read, mute toggle. Adoption threads already created in Wave 3 — reuse them.
- RLS: only participants read a thread's messages and may send.
- Done when: account A starts a DM with B (allowed by policy), sends a message; B sees it via query;
  blocked pairs cannot start a thread.

**Sub-agent C — Realtime + Messages screens** *(after B)*
- Subscribe to `messages` inserts per open thread (`supabase.channel('thread:'+id).on('postgres_changes'…)`),
  plus a thread-list subscription for preview/unread bumps. Use broadcast for typing (optional).
- Rewire `MessagesScreen` (thread list, unread dots) and `ChatThreadScreen` (live bubbles, read
  receipts, composer) keeping their layouts. Cold-load via query, then subscribe; re-query on
  reconnect to close gaps. Add `ChatPeerOptionsSheet` actions: mute/unmute, report (→ `reports`),
  block (→ `blocked_users`).
- Done when: two devices/accounts exchange messages that appear in **real time**; unread + read state
  update; mute/report/block work.

**Sub-agent D — Adoption thread panel** *(after C)*
- In the adoption-linked thread, surface the in-thread panel actions ("Mark as adopted", "Post
  update", "Relist") by calling the Wave 3 adoption RPCs; emit a `thread.updated`/system message on
  state change. Keep the existing panel UI.
- Done when: from inside an approved adoption chat, the poster can Mark-as-adopted and the adopter can
  Post-update, and the thread reflects the new state live.

---

**Integrate & verify:** `npx tsc --noEmit` clean; `npm start` boots. Two-account realtime chat works;
adoption chat actions work; rescue loop works. RLS: a non-participant **cannot** read a thread; a
blocked user **cannot** DM. Run `/verify`. Report and STOP for `/code-review` + commit.

**Guardrails:** unchanged UI; exact context APIs; realtime must reconcile on reconnect; RLS verified
with attacker account; enums = frontend unions; stop-and-ask on cost/UX/security/DEFERRED.
