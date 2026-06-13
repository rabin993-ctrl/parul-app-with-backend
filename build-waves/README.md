# Parul — Build Waves (Claude Code prompts)

Paste-ready prompts to build Parul end-to-end by wiring the **existing Expo / React Native app** in
this repo to **Supabase (free tier)**, using **Claude Code with Claude Sonnet**. Each **wave** is a
single prompt you paste into Claude Code; the prompt orchestrates **multiple sub-agents in parallel**
to finish that wave, then verifies the result.

## How to use this bundle

1. **Do the one-time setup first:** open [`PREREQUISITES.md`](PREREQUISITES.md) and run it on your
   Linux machine (terminal-first). It creates the Supabase project, links the repo, and sets `.env`.
   **Do not start Wave 0 until prerequisites pass.**
2. **Run waves in order.** Open a Claude Code session in the repo root, paste the wave file's
   contents as your message, and let it run. Each wave:
   - launches parallel sub-agents (via the Task tool),
   - integrates their output,
   - runs the **exit check** (it runs the app and tests with two accounts),
   - stops and reports.
3. **Review between waves.** When a wave reports done, run `/code-review` on the diff, then commit
   (`git add -A && git commit`). Only move to the next wave once the exit check passed.
4. **One wave at a time.** Don't paste two waves at once — each depends on the previous wave's tables,
   RLS, and rewired contexts.

## Wave order

| Wave | File | Goal | Tier |
|------|------|------|------|
| 0 | [`wave-00-foundation.md`](wave-00-foundation.md) | Migrations, client, storage, **auth (email + Google)** | MVP |
| 1 | [`wave-01-identity-companions.md`](wave-01-identity-companions.md) | Profile, privacy, blocking, reviews, companions | MVP |
| 2 | [`wave-02-feed.md`](wave-02-feed.md) | Posts, reactions, **threaded comments + replies**, saves, forwards, media | MVP |
| 3 | [`wave-03-adoption.md`](wave-03-adoption.md) | Listings, requests, records, **milestone sweep**, endorsements | MVP (core) |
| 4 | [`wave-04-rescue-messaging-realtime.md`](wave-04-rescue-messaging-realtime.md) | Rescue cases, **1:1 + adoption chat**, Supabase Realtime | MVP |
| 5 | [`wave-05-notifications-push.md`](wave-05-notifications-push.md) | Unified notifications + **Expo push** | MVP |
| 6 | [`wave-06-circles-community.md`](wave-06-circles-community.md) | Paw Circles group chat, Community groups, Treats | Stretch |
| 7 | [`wave-07-hardening-deploy.md`](wave-07-hardening-deploy.md) | **RLS audit**, seed, gate Vet, **deploy web to your droplet** | MVP |
| 8 | [`wave-08-mobile-polish.md`](wave-08-mobile-polish.md) | FlatList lists, safe-area/keyboard fixes, clear `tsc`, touch targets | Parallel/anytime |

> **Wave 8 is independent of the backend** — it can run in parallel with Waves 1–6 (it only touches UI
> files, refactor-only). See `docs/MOBILE-OPTIMIZATION-AUDIT.md` for the findings it fixes.

## Ground rules every wave enforces (so nothing breaks or drifts)

- **Don't change the UI.** Screens stay frozen. Rewire **context internals** only, keeping each
  context's exact public API (hook names, return shapes, function signatures). See
  [`../docs/backend/05-flutter-integration.md`](../docs/backend/05-flutter-integration.md) §1.
- **DB enums must equal the frontend's string-literal unions** (already aligned in
  [`../docs/backend/02-data-model.md`](../docs/backend/02-data-model.md)). Don't invent values.
- **RLS is default-deny.** Every table has policies; every privacy/ownership rule is enforced in the
  DB. Verify with an "attacker" second account that should be **denied** (doc 07 §7).
- **Keep the app runnable** after every sub-agent merges. The existing screens are the test harness.
- **Stop and ask the human** before anything that: costs money, changes UI/UX, weakens an RLS policy,
  or touches a DEFERRED feature (Vet, payments, phone OTP).
- **DEFERRED — do not build:** Vet Consult (gated "coming soon"), payments, phone OTP. Money later is
  **BDT (৳)**.

## Source-of-truth docs (sub-agents must read the relevant ones)

- Schema → [`../docs/backend/02-data-model.md`](../docs/backend/02-data-model.md)
- Behavior/operations → [`../docs/backend/03-api-reference.md`](../docs/backend/03-api-reference.md)
- Realtime + notifications → [`../docs/backend/04-realtime-and-notifications.md`](../docs/backend/04-realtime-and-notifications.md)
- RN/Supabase client patterns → [`../docs/backend/05-flutter-integration.md`](../docs/backend/05-flutter-integration.md)
- The plan + RLS/security + deploy → [`../docs/backend/07-7day-execution-plan.md`](../docs/backend/07-7day-execution-plan.md)
- Feature behavior → [`../FEATURES.md`](../FEATURES.md)
