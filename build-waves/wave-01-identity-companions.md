… PASTE EVERYTHING BELOW THIS LINE INTO CLAUDE CODE …

You are orchestrating **Wave 1 — Identity, Privacy, Companions** for Parul. Wave 0 (schema, client,
auth) is done and committed. Goal: profile editing, privacy settings, blocking, reviews/trust, and
companions are fully backed by Supabase with RLS. KEEP the UI; rewire **context internals** only.

Read first: `docs/backend/02-data-model.md` (§2–3), `docs/backend/03-api-reference.md`
(Users/profiles, Privacy, Companions), `docs/backend/05-rn-supabase-integration.md` (§4, §8),
`docs/backend/07-7day-execution-plan.md` (§7 RLS). These sub-agents touch independent tables/contexts
— run **all four in parallel**.

---

**Sub-agent A — Privacy & blocking**
- Rewire `src/context/UserPrivacyContext.tsx` to `user_privacy_settings` + `blocked_users` (keep its
  API: settings object, `patchSettings`, `blockUser`, `unblockUser`, `blockedUserIds`).
- Persist the notification toggles + `show_treats_on_profile` columns too.
- RLS: a user reads/writes only their own settings; `blocked_users` only their own rows.
- Wire `ProfilePrivacyScreen` + `ProfileBlockedUsersScreen` data (no layout changes).
- Done when: changing any privacy toggle persists across reload; block/unblock persists.

**Sub-agent B — Reviews & trust**
- Implement `reviews` read/insert (one per author→subject). Add the `profile_trust` view from doc 02
  §2 and expose it for `ReviewsSafetyScreen` (rating, reviewCount, flagCount, status).
- RLS: anyone may read reviews on a public profile; only the author may insert/delete their review;
  you can't review yourself.
- Done when: leaving a review from account B shows on account A's Reviews & Safety, and trust
  status/rating compute correctly.

**Sub-agent C — Companions**
- Rewire `src/context/CompanionContext.tsx` to `companions` (+ `companion_followers`): CRUD,
  add-manually, add-from-adoption (`from-adoption` uses a confirmed `adoption_records` row), follow/
  unfollow, siblings = same-owner query. Keep the exact context API used by `AddCompanionSheet`,
  `CompanionProfile`, profile companions row.
- Wire companion avatar upload via `src/lib/uploads.ts` (bucket `avatars`).
- RLS: owner may write own companions; reads respect `show_companions` privacy.
- Done when: add a pet (manual + photo), edit, remove, follow another user's pet — all persist; the
  CompanionProfile modal renders real data.

**Sub-agent D — Profile shell data**
- Wire `ProfileHomeScreen` data hooks: impact stats (rescues/rehomed/adopted counts), Posts/Activity/
  Saved tabs scaffolding (real queries land in Wave 2/3 — return empty-but-correct shapes now), and
  the About-You edit (bio/location → `users`, reuse Wave 0's `CurrentUserProfileContext`).
- Done when: profile renders the signed-in user's real name/handle/bio/location and stat counts
  without crashing; empty tabs show their existing empty states.

---

**Integrate & verify:** `npx tsc --noEmit` clean; `npm start` boots. Two-account check: account B
**cannot** read account A's settings/blocked list (RLS denies); blocking hides B's future content
from A. Run `/verify` on profile + privacy + companions. Report and STOP for `/code-review` + commit.

**Guardrails:** unchanged UI; exact context APIs; RLS default-deny verified with an attacker account;
DB enums = frontend unions; stop-and-ask on cost/UX/security/DEFERRED.
