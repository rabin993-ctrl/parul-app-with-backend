# migrations/

Ordered SQL files that define the database (schema + RLS). Naming: `NNNN_description.sql`.

**All tables ship in `0001_init.sql`.** Later wave migrations add only **RLS policies, RPCs, and
triggers** for each domain — they do not create tables (every table already exists with RLS
enabled / default-deny).

| File | Wave | Contents |
|------|------|----------|
| `0001_init.sql` | 0 | ✅ **written** — all non-deferred enums + 50 tables + indexes, `auth.users→users` bootstrap trigger (+ privacy/wallet seed), `profile_trust` view, RLS enabled default-deny on every table + baseline identity policies |
| `0002_identity_companions_rls.sql` | 1 | policies for companions, reviews, privacy reads, blocking |
| `0003_feed_rls.sql` | 2 | policies + RPCs for posts/comments(threading)/reactions/saves/forwards |
| `0004_adoption_rls.sql` | 3 | adoption policies + RPCs (approve/confirm/update/endorse) + milestone sweep (enables `pg_cron`) |
| `0005_rescue_messaging_rls.sql` | 4 | rescue + threads/messages policies; realtime publication |
| `0006_notifications.sql` | 5 | notification fan-out helpers + policies |
| `0007_circles_community_treats_rls.sql` | 6 | circles, community, treats policies + RPCs (stretch) |

DEFERRED (not created): `vets*`, `vet_consultations*`, `payments`. See doc 02 retrofit note.

Apply with `npm run db:push`. Generate new migrations from schema edits with `npm run db:diff`.
