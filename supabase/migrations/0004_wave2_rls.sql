-- 0004_wave2_rls.sql — Wave 2 RLS: Feed (posts, reactions, saves, forwards, comments, notifications)
-- All tables below have RLS enabled (default-deny) from 0001. This adds the Wave-2 policies.

-- ────────────────────────────────────────────────────────────────────────────
-- posts — authenticated read non-deleted; author write
-- Full post_visibility enforcement is Wave 7; simplified here.
-- ────────────────────────────────────────────────────────────────────────────
create policy posts_select_auth on posts
  for select to authenticated using (deleted_at is null);

create policy posts_insert_own on posts
  for insert to authenticated
  with check (author_user_id = auth.uid());

create policy posts_update_own on posts
  for update to authenticated
  using (author_user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- post_media — follows parent post's visibility; author inserts/deletes
-- ────────────────────────────────────────────────────────────────────────────
create policy post_media_select_auth on post_media
  for select to authenticated using (
    exists (select 1 from posts where posts.id = post_media.post_id and posts.deleted_at is null)
  );

create policy post_media_insert_own on post_media
  for insert to authenticated with check (
    exists (select 1 from posts where posts.id = post_media.post_id and posts.author_user_id = auth.uid())
  );

create policy post_media_delete_own on post_media
  for delete to authenticated using (
    exists (select 1 from posts where posts.id = post_media.post_id and posts.author_user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────────────────────
-- post_companions — follows parent post; author inserts/deletes
-- ────────────────────────────────────────────────────────────────────────────
create policy post_companions_select_auth on post_companions
  for select to authenticated using (
    exists (select 1 from posts where posts.id = post_companions.post_id and posts.deleted_at is null)
  );

create policy post_companions_insert_own on post_companions
  for insert to authenticated with check (
    exists (select 1 from posts where posts.id = post_companions.post_id and posts.author_user_id = auth.uid())
  );

create policy post_companions_delete_own on post_companions
  for delete to authenticated using (
    exists (select 1 from posts where posts.id = post_companions.post_id and posts.author_user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────────────────────
-- post_alerts — follows parent post; author inserts/deletes
-- ────────────────────────────────────────────────────────────────────────────
create policy post_alerts_select_auth on post_alerts
  for select to authenticated using (
    exists (select 1 from posts where posts.id = post_alerts.post_id and posts.deleted_at is null)
  );

create policy post_alerts_insert_own on post_alerts
  for insert to authenticated with check (
    exists (select 1 from posts where posts.id = post_alerts.post_id and posts.author_user_id = auth.uid())
  );

create policy post_alerts_delete_own on post_alerts
  for delete to authenticated using (
    exists (select 1 from posts where posts.id = post_alerts.post_id and posts.author_user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────────────────────
-- post_reactions — all authenticated read; own insert/delete (toggle paw)
-- ────────────────────────────────────────────────────────────────────────────
create policy post_reactions_select_auth on post_reactions
  for select to authenticated using (true);

create policy post_reactions_insert_own on post_reactions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy post_reactions_delete_own on post_reactions
  for delete to authenticated
  using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- post_saves — own saves only; no cross-user visibility
-- ────────────────────────────────────────────────────────────────────────────
create policy post_saves_select_own on post_saves
  for select to authenticated using (user_id = auth.uid());

create policy post_saves_insert_own on post_saves
  for insert to authenticated
  with check (user_id = auth.uid());

create policy post_saves_delete_own on post_saves
  for delete to authenticated
  using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- post_forwards — all authenticated read (drives public forward counts); own insert
-- ────────────────────────────────────────────────────────────────────────────
create policy post_forwards_select_auth on post_forwards
  for select to authenticated using (true);

create policy post_forwards_insert_own on post_forwards
  for insert to authenticated
  with check (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- comments — authenticated reads non-deleted; author inserts/soft-deletes
-- ────────────────────────────────────────────────────────────────────────────
create policy comments_select_auth on comments
  for select to authenticated using (deleted_at is null);

create policy comments_insert_own on comments
  for insert to authenticated
  with check (author_user_id = auth.uid());

create policy comments_update_own on comments
  for update to authenticated
  using (author_user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- comment_reactions — all authenticated read; own insert/delete
-- ────────────────────────────────────────────────────────────────────────────
create policy comment_reactions_select_auth on comment_reactions
  for select to authenticated using (true);

create policy comment_reactions_insert_own on comment_reactions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy comment_reactions_delete_own on comment_reactions
  for delete to authenticated
  using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- saved_items — own CRUD only
-- ────────────────────────────────────────────────────────────────────────────
create policy saved_items_select_own on saved_items
  for select to authenticated using (user_id = auth.uid());

create policy saved_items_insert_own on saved_items
  for insert to authenticated
  with check (user_id = auth.uid());

create policy saved_items_delete_own on saved_items
  for delete to authenticated
  using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- notifications — own read/delete; actor inserts (Wave 5 moves fan-out to Edge Function)
-- ────────────────────────────────────────────────────────────────────────────
create policy notifications_select_own on notifications
  for select to authenticated using (recipient_id = auth.uid());

create policy notifications_delete_own on notifications
  for delete to authenticated
  using (recipient_id = auth.uid());

create policy notifications_insert_actor on notifications
  for insert to authenticated
  with check (actor_user_id = auth.uid());
