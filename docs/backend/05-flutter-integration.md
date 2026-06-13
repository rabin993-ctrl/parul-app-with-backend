# 05 — React Native + Supabase Integration Guide

> **This doc was originally written for Flutter and has been replaced.** The locked direction is to
> keep the **existing Expo / React Native app** in this repo and wire it to **Supabase**. This is the
> client-integration reference; the day-by-day execution is in
> [`07-7day-execution-plan.md`](07-7day-execution-plan.md). (Filename kept for stable links.)

## 1. The integration seam: rewire contexts, freeze screens

The app's screens already consume **React Context** providers (`src/context/*`) that today hold mock
data. We reimplement each context's **internals** to call Supabase while keeping its **exact public
API** (hook name + returned shape + function signatures). Screens don't change.

```
Screen ──uses──► useAdoptionFeed()            // unchanged
                       │  (same API surface)
                       ▼
                 Supabase: supabase.from('adoption_listings')... / supabase.rpc('approve_request', …)
```

Migrate **one context per domain**, keeping the app runnable throughout. Keep `DevResetContext` /
`seedSnapshots` as a local fallback during migration; remove once a domain is fully on Supabase.

## 2. Client setup

```
npm i @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

`src/lib/supabase.ts`:

```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './db-types'; // generated

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // RN, not web-redirect based
    },
  },
);
```

- **Env:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` (Expo exposes
  `EXPO_PUBLIC_*` to the client). Never ship the **service role** key in the app.
- **Types:** generate with `supabase gen types typescript --linked > src/lib/db-types.ts` and re-run
  whenever migrations change.

## 3. Auth (email + Google; no phone OTP yet)

```ts
// sign up / in
await supabase.auth.signUp({ email, password });
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
await supabase.auth.signOut();

// session restore on launch
supabase.auth.onAuthStateChange((_event, session) => { /* hydrate CurrentUserProfileContext */ });
```

- On first login, ensure a **public `users` profile row** exists (DB trigger on `auth.users` insert,
  or an Edge Function / upsert from the client).
- Google OAuth in Expo uses `expo-auth-session` / `expo-web-browser` for the redirect; configure the
  redirect URL in Supabase Auth settings (see prerequisites in the build-waves bundle).
- **Phone OTP is deferred to Phase 2** — don't wire `signInWithOtp({ phone })` yet.

## 4. Data access patterns

**Direct queries (RLS-guarded)** for CRUD/lists:

```ts
const { data, error } = await supabase
  .from('posts')
  .select('*, author:users(*), media:post_media(*), reactions:post_reactions(count)')
  .order('created_at', { ascending: false })
  .limit(20);
```

**RPC (Postgres functions)** for multi-step / atomic operations — approve request (opens thread),
confirm adoption (seeds milestone), give treat (wallet rules), helpful toggle (+count):

```ts
const { data, error } = await supabase.rpc('approve_adoption_request', { request_id });
```

Map each route in [`03-api-reference.md`](03-api-reference.md) to either a direct query or an RPC.
Keep DB enum values identical to the frontend's string-literal unions (already aligned in
[`02`](02-data-model.md)) so context return shapes don't change.

## 5. Realtime (chat, circles, notifications)

```ts
const channel = supabase
  .channel(`thread:${threadId}`)
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
      (payload) => appendMessage(payload.new))
  .subscribe();
// cleanup: supabase.removeChannel(channel)
```

- Subscribe in `ChatThreadScreen`, `CircleChatScreen`, and a global notifications listener.
- RLS governs what change events you receive — you only get rows you may read.
- Use **broadcast** for ephemeral typing/presence (not persisted).
- Cold-load via query first, then subscribe; on reconnect, re-query to close gaps.

## 6. Storage & media

```ts
// upload from the composer
const path = `posts/${userId}/${uuid}.jpg`;
await supabase.storage.from('post-media').upload(path, fileBlob, { contentType: 'image/jpeg' });
const { data } = supabase.storage.from('post-media').getPublicUrl(path); // or createSignedUrl for private
```

- Buckets: `avatars`, `post-media`, `adoption-media`, `rescue-media`, `circle-media`.
- Public buckets for feed images; **signed URLs** for private content (adoption update photos visible
  only to poster/adopter). Storage RLS policies mirror table access.
- The prototype's `images: number` / `photoCount` become real `*_media` rows.

## 7. Threading, comments & replies (called out explicitly)

The app has **2-level threads** (comment → replies) in feed, community, and adoption update notes.
Backed by a self-referencing table (`comments.parent_id`, `community_comments.parent_id`):

- **Top-level comment:** `parent_id = null`.
- **Reply:** `parent_id = <comment id>`.
- **Fetch:** one query ordered by `created_at`, then group replies under parents client-side (the
  context already returns `threads[].replies[]`); or two queries (parents, then replies in).
- **Mentions (@):** store referenced `user_id`s; the MentionPicker stays UI-only.
- **Reactions on comments** (`comment_reactions`) drive the per-comment paw/helpful counts.

Keep the existing `PostThread`/`CommunityThread` shapes so `FeedCommentSheet`,
`CommunityCommentSheet`, and the reply inputs work unchanged.

## 8. RLS-aware client expectations

Because authorization lives in the DB, the client must handle **empty results / permission errors
gracefully** (a blocked user's content simply isn't returned). Don't assume a write succeeded —
check `error`. Privileged operations (fan-out, sweeps) never run from the client; they're Edge
Functions with the service role.

## 9. Deploying the app live (your droplet)

Two surfaces:

- **Mobile (primary):** EAS build → TestFlight / Play internal testing. `eas build -p android` /
  `-p ios`.
- **Web (for "live use" on your VPS):** `npx expo export -p web` produces a static `dist/`; serve it
  on the droplet behind **Caddy** (automatic HTTPS) or nginx. The web app talks to the same managed
  Supabase backend. Terminal steps are in the build-waves **PREREQUISITES** + **Wave 7**.

> Backend stays on **managed Supabase (free tier)**; the droplet hosts the **web frontend**. A live
> app with traffic won't hit Supabase's inactivity pause; a daily `pg_cron` keep-alive covers quiet
> periods. (Self-hosting Supabase on the droplet is possible but heavier — not recommended for the
> 7-day sprint.)

## 10. Env & config summary

| Var | Where | Notes |
|-----|-------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | app `.env` | project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | app `.env` | safe to ship (RLS protects data) |
| `SUPABASE_ACCESS_TOKEN` | shell only | CLI auth for migrations/types (never in app) |
| service role key | server/Edge only | **never** in the client |
| `EXPO_PUBLIC_SENTRY_DSN` | app `.env` | optional error reporting |
