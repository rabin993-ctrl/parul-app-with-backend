-- Allow post authors to update their lost/found alert rows (upsert on edit).

do $$ begin
  create policy post_alerts_update_own on post_alerts
    for update to authenticated
    using (
      exists (
        select 1 from posts
        where posts.id = post_alerts.post_id
          and posts.author_user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from posts
        where posts.id = post_alerts.post_id
          and posts.author_user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;
