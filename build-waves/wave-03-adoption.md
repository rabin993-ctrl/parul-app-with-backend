… PASTE EVERYTHING BELOW THIS LINE INTO CLAUDE CODE …

You are orchestrating **Wave 3 — Adoption (the core product)** for Parul. Waves 0–2 are committed.
Goal: the full adoption loop on Supabase — list → request → approve → confirm → milestone care
timeline → home updates → endorsements — including the scheduled **milestone sweep**. KEEP the UI;
rewire **context internals** only.

Read first: `docs/backend/02-data-model.md` (§8 Adoption), `docs/backend/03-api-reference.md`
(Adoption), `docs/backend/04-realtime-and-notifications.md` (adoption notification types),
`docs/backend/07-7day-execution-plan.md` (Day 4), `FEATURES.md` (Adoption section for exact states).

**Orchestration:** run **A, B, C in parallel** (listings / requests / records are mostly independent
tables); then **D** adds the cron sweep; **E integrates** the two contexts last.

---

**Sub-agent A — Listings**
- `adoption_listings` (+ `adoption_listing_media`, `adoption_listing_saves`): create, edit, browse
  with filters (species/status/age_group/gender/urgency/vaccinated/location), search, save/unsave,
  mark-adopted (`{note}`), relist. Gallery upload via bucket `adoption-media`.
- RLS: poster writes own listing; everyone reads `Available/Urgent`; `Adopted` per rules.
- Done when: create a listing with a gallery; browse + search + save it from a second account.

**Sub-agent B — Requests + poster inbox**
- `adoption_requests`: submit (`{message}`), cancel, list outgoing, poster inbox per listing. Statuses
  `submitted|approved|rejected|adopted`.
- Postgres function `approve_adoption_request(request_id)` → sets `approved`, creates/links a
  messaging `thread` (type `adoption`) between poster and requester, returns `thread_id`.
- `reject_adoption_request(request_id)`.
- RLS: requester sees own requests; poster sees requests on own listings only.
- Done when: account B requests account A's listing; A sees it in the poster inbox; A approves →
  a thread id is returned and the request shows `approved`.

**Sub-agent C — Records, updates, endorsements**
- `adoption_records` (+ `adoption_updates`, `adoption_update_media`). RPCs:
  - `propose_adoption(listing_id, ...)` → record `pending_confirmation`.
  - `confirm_adoption(record_id)` → `confirmed`, set `confirmed_at`, seed the bootstrap first update,
    schedule `next_update_due_at` (week_1).
  - `post_adoption_update(record_id, {text, media_ids, has_video, milestone_id})`.
  - `endorse_adopter(record_id, recommendation, text?)` and `adopter_respond(record_id, text)`.
- RLS: only that record's poster + adopter can read/write it and its updates.
- Done when: confirm an adoption; post a home update with a photo; poster endorses; adopter responds —
  all visible on the care profile.

**Sub-agent D — Milestone sweep (pg_cron + Edge Function)**
- Implement milestone schedule week_1=+7d, month_1=+30d, month_3=+90d, month_6=+180d from
  `confirmed_at`. An Edge Function (service role) run hourly by `pg_cron`: find `confirmed`/`update_due`
  records past `next_update_due_at`, move to `update_due`, create `update_request` notification rows +
  prompts, advance `next_update_due_at` to the next milestone.
- Done when: a manually back-dated `confirmed_at` produces an `update_request` notification + a prompt
  on the next sweep (you can invoke the function directly to test).

**Sub-agent E — Rewire AdoptionFeedContext + AdoptionContext** *(last)*
- Replace internals of `src/context/AdoptionFeedContext.tsx` (listings/requests/notifications) and
  `src/context/AdoptionContext.tsx` (records/updates/chat-thread linkage) to use A–D, keeping exact
  public APIs consumed by the adoption screens, flip cards, poster inbox, care timeline.
- Done when: the Adoption hub (Browse / My listings / Chats), detail, create/edit/manage, and the
  AdoptedDetail care profile all run on Supabase.

---

**Integrate & verify:** `npx tsc --noEmit` clean; `npm start` boots. Full two-account loop:
list → request → approve → confirm → milestone prompt → post update → endorse. RLS: a third account
**cannot** read the record, its chat, or its updates. Run `/verify`. Report and STOP for
`/code-review` + commit.

**Guardrails:** unchanged UI; exact context APIs; milestone math correct & idempotent; RLS verified
with attacker account; enums = frontend unions; stop-and-ask on cost/UX/security/DEFERRED. The chat
thread opens here but live messaging is wired in Wave 4 — until then the thread exists and loads via
query.
