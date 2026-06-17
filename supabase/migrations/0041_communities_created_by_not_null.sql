-- 0041_communities_created_by_not_null.sql
-- Restore the NOT NULL invariant on communities.created_by.
--
-- 0013 dropped NOT NULL solely so it could seed demo communities with a NULL
-- creator directly in the migration. Those demo rows are no longer seeded there
-- (the real demo set in seed.sql always sets a creator), and every community is
-- now created via create_community() (which sets auth.uid()) or seed.sql — both
-- always populate created_by. Re-assert the constraint.

alter table public.communities alter column created_by set not null;
