# migrations/

Ordered SQL files that define the database (schema + RLS). Naming: `NNNN_description.sql`.

Planned sequence (authored across the build waves — see `docs/backend/02-data-model.md`):

| File | Wave | Contents |
|------|------|----------|
| `0001_init.sql` | 0 | enums, identity, companions, media, storage buckets, `users` bootstrap trigger |
| `0002_feed.sql` | 2 | posts, media, reactions, comments (threading), saves, forwards, alerts + RLS |
| `0003_adoption.sql` | 3 | listings, requests, records, updates, milestone RPCs + RLS |
| `0004_rescue_messaging.sql` | 4 | rescue cases/updates, threads, messages, read state + RLS |
| `0005_notifications.sql` | 5 | notifications, push_tokens, fan-out helpers |
| `0006_circles_community_treats.sql` | 6 | circles, community, treats + RLS (stretch) |

DEFERRED (not created now): `vets*`, `vet_consultations*`, `payments`. See doc 02 retrofit note.

Apply with `npm run db:push`. Generate new migrations from schema edits with `npm run db:diff`.
