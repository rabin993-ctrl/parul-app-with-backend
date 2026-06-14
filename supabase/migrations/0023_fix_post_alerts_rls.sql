-- Ensure post_alerts RLS policies exist.
-- Safe to re-run: each block catches "duplicate_object" if the policy is already there.

do $$ begin
  create policy post_alerts_select_auth on post_alerts
    for select to authenticated using (
      exists (select 1 from posts where posts.id = post_alerts.post_id and posts.deleted_at is null)
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy post_alerts_insert_own on post_alerts
    for insert to authenticated with check (
      exists (select 1 from posts where posts.id = post_alerts.post_id and posts.author_user_id = auth.uid())
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy post_alerts_delete_own on post_alerts
    for delete to authenticated using (
      exists (select 1 from posts where posts.id = post_alerts.post_id and posts.author_user_id = auth.uid())
    );
exception when duplicate_object then null;
end $$;
