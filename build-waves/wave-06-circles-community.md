… PASTE EVERYTHING BELOW THIS LINE INTO CLAUDE CODE …

You are orchestrating **Wave 6 — Paw Circles + Community + Treats (STRETCH)** for Parul. Waves 0–5 are
committed. Goal: group chat circles, community groups + discussions, and the treats wallet — all on
Supabase. KEEP the UI; rewire **context internals** only. This wave is Stretch: if time is short, ship
Circles first (it's in the app's onboarding), then Community, then Treats.

Read first: `docs/backend/02-data-model.md` (§6 Community, §7 Circles, §11 Treats),
`docs/backend/03-api-reference.md` (Community, Paw Circles, Treats),
`docs/backend/04-realtime-and-notifications.md` (circle events), `FEATURES.md` (Community, Paw Circles,
Treats). All four sub-agents touch independent contexts — run **in parallel**.

---

**Sub-agent A — Paw Circles: circles, members, requests**
- Rewire `src/context/PawCircleContext.tsx` to `circles` (+ `circle_members`, `circle_join_requests`):
  create, explore (all/popular/nearby + search), join (open) / request (request), leave, members
  (sort alpha/date), roles, approve/deny/accept-all requests, admin edit/remove/delete/transfer,
  mute, report (→ `reports`). Keep its exact API + onboarding flow.
- RLS: members read circle content; admins manage; requests visible to admins.
- Done when: create a circle, another account joins/requests, admin manages members — all persist.

**Sub-agent B — Paw Circles: group chat (realtime), pins, media**
- `circle_messages` (text / system / shared_post) + `circle_message_media`. Realtime subscribe per
  circle (`circle:{id}`); send text + share a feed post; system messages on member join; pin/unpin;
  shared-media + pinned-messages sheets. Mute + last_read for unread.
- Done when: two accounts chat in a circle in real time; sharing a post works; pin + shared media
  populate the settings sheets.

**Sub-agent C — Community groups + discussions**
- Rewire `src/context/CommunityGroupsContext.tsx` (groups, membership, join policy, admin settings,
  pending requests, member removal) and `src/context/CommunityFeedContext.tsx` (discussions: create/
  preview/publish, category/topics, helpful votes, threaded comments, saves via `saved_items`,
  search). Image via bucket `post-media`. Honor `post_approval` (approved flag).
- RLS: members post per policy; admins moderate; reads honor `members_only`/`discoverable`.
- Done when: create a group, join from another account, post a discussion, helpful + comment + reply,
  search, and run an admin setting change + approve a join request.

**Sub-agent D — Treats**
- Rewire `src/context/TreatWalletContext.tsx` to `treat_wallets` + `treat_gifts`. RPC `give_treat`
  enforcing the rules: allowance 100 / 30-day rolling reset, can't gift own pet (`own_pet`), not over
  remaining (`empty`), per-companion debounce, unknown pet → return the exact `{ok:false, reason}`
  union. Received counts = sum over gifts; `show_treats_on_profile` toggle.
- Done when: gifting a treat decrements the wallet, shows in Recent Love, triggers the gift-burst, and
  the documented guard reasons all return correctly; wallet resets after the period.

---

**Integrate & verify:** `npx tsc --noEmit` clean; `npm start` boots. Two-account checks: circle chat
realtime; community discussion with helpful + threaded replies; treat gifting with guards. RLS: a
non-member can't read a private circle/community's content. Run `/verify`. Report and STOP for
`/code-review` + commit.

**Guardrails:** unchanged UI; exact context APIs; realtime reconciles on reconnect; treat rule reasons
must match the union exactly; RLS verified with attacker account; stop-and-ask on
cost/UX/security/DEFERRED. If time-boxed, ship A+B (Circles) and C (Community); D (Treats) can slip to
a fast-follow.
