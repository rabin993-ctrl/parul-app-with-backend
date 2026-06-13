… PASTE EVERYTHING BELOW THIS LINE INTO CLAUDE CODE …

You are orchestrating **Wave 2 — Feed** for Parul. Waves 0–1 are committed. Goal: the home feed is
fully real — create posts with media, paw reactions, **threaded comments + replies**, saves,
forwards, and lost/found alerts — all RLS-guarded. KEEP the UI; rewire **context internals** only.

Read first: `docs/backend/02-data-model.md` (§5 Feed), `docs/backend/03-api-reference.md` (Feed),
`docs/backend/05-flutter-integration.md` (§4, §7 threading), `docs/backend/04-realtime-and-notifications.md`
(comment/like notifications — rows only this wave; push lands Wave 5). Threading correctness is a
first-class goal of this wave.

**Orchestration:** run **A** first (it owns the core post queries + RLS the others build on); then run
**B, C, D in parallel**; **E integrates** the context last.

---

**Sub-agent A — Posts core + media + alerts + RLS**
- Implement `posts` create/edit/delete/list with `post_media` (upload via `src/lib/uploads.ts`,
  bucket `post-media`), `post_companions` tags, `post_alerts` (lost/found), `companion_author_id`
  ("paw posting"), `tag`, `circle_id`.
- Feed query with filters: circle scope, `tag` (lost-found/discussion/meme), nearby; cursor paging.
- RLS: author writes own posts; reads honor `post_visibility` + `blocked_users`.
- Done when: a post with a photo + a lost/found alert appears in the feed for a second account.

**Sub-agent B — Reactions, saves, forwards + counts**
- Implement `post_reactions` (paw toggle), `saved_items` (feed_post), `post_forwards` (to feed /
  community). Expose paw/comment/forward/saved counts + `reacted`/`saved` flags matching the
  `FeedPostCard` props.
- Use a Postgres function for forward fan-out (creates the forwarded reference + count).
- Done when: paw/unpaw, save/unsave, and forward update counts live for the acting user.

**Sub-agent C — Threaded comments + replies (CRITICAL)**
- Implement `comments` (self-referencing `parent_id`: null = top-level, set = reply) + `comment_reactions`.
- Provide read shaped as the existing `PostThread[]` with nested `replies[]`, and writes for
  top-level comment, reply-to-comment, and paw-on-comment. Preserve @-mention text (MentionPicker
  stays UI-only).
- RLS: comment authors write own; reads follow the post's visibility.
- Wire `FeedCommentSheet` + reply inputs to the real data WITHOUT changing layout.
- Done when: on two accounts — comment, reply to that comment, paw a comment, and see correct nesting,
  ordering, and counts in the sheet; reload preserves the thread.

**Sub-agent D — Notification rows for feed events**
- On paw/comment/mention, insert `notifications` rows (types `like`, `comment`, `mention`) with the
  `data` payload from doc 04 §4 (post_id, comment_id). Respect `notify_post_activity` + blocking.
  (Delivery/push is Wave 5 — rows only here.)
- Done when: account A pawing/commenting on account B's post creates the correct notification row for B.

**Sub-agent E — Rewire FeedPostContext** *(last)*
- Replace `src/context/FeedPostContext.tsx` internals to use A–D, keeping its exact public API and
  the overlays in `FeedPostOverlays`. Remove mock/AsyncStorage paths for feed.
- Done when: the whole Feed tab (compose, react, comment, reply, save, forward, lost/found cards)
  runs on Supabase with no mock data.

---

**Integrate & verify:** `npx tsc --noEmit` clean; `npm start` boots. Two-account end-to-end:
post → react → comment → **reply** → save → forward, with correct counts and threading, surviving
reload. Confirm RLS: a blocked account can't see the post or comment. Run `/verify`. Report and STOP
for `/code-review` + commit.

**Guardrails:** unchanged UI; exact context API; threading must be correct (parent/child, ordering,
counts); RLS verified with attacker account; enums = frontend unions; stop-and-ask on
cost/UX/security/DEFERRED.
