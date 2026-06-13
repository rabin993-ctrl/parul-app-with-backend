-- 0003_wave1_rls.sql — Wave 1 RLS: Reviews, Media, Companions
-- All tables below have RLS enabled (default-deny) from 0001. This adds the
-- Wave-1-scoped policies so the rewired contexts can read/write.

-- ────────────────────────────────────────────────────────────────────────────
-- media_assets — public read; owner write
-- ────────────────────────────────────────────────────────────────────────────
create policy media_select_auth on media_assets
  for select to authenticated using (true);

create policy media_insert_own on media_assets
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy media_update_own on media_assets
  for update to authenticated
  using (owner_id = auth.uid());

create policy media_delete_own on media_assets
  for delete to authenticated
  using (owner_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- reviews — any authenticated user reads; author inserts (not on self);
--           author deletes own
-- ────────────────────────────────────────────────────────────────────────────
create policy reviews_select_auth on reviews
  for select to authenticated using (true);

create policy reviews_insert_own on reviews
  for insert to authenticated
  with check (
    author_user_id = auth.uid()
    and subject_user_id <> auth.uid()
  );

create policy reviews_delete_own on reviews
  for delete to authenticated
  using (author_user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- companions — authenticated reads non-deleted; owner CRUD (soft-delete only)
-- Privacy refinement (show_companions) is in Wave 7 RLS audit.
-- ────────────────────────────────────────────────────────────────────────────
create policy companions_select_auth on companions
  for select to authenticated
  using (deleted_at is null);

create policy companions_insert_own on companions
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy companions_update_own on companions
  for update to authenticated
  using (owner_id = auth.uid());

-- No hard-delete policy; use soft-delete (update deleted_at) to preserve FK integrity.

-- ────────────────────────────────────────────────────────────────────────────
-- companion_followers — authenticated reads; own insert/delete
-- ────────────────────────────────────────────────────────────────────────────
create policy companion_followers_select_auth on companion_followers
  for select to authenticated using (true);

create policy companion_followers_insert_own on companion_followers
  for insert to authenticated
  with check (user_id = auth.uid());

create policy companion_followers_delete_own on companion_followers
  for delete to authenticated
  using (user_id = auth.uid());
