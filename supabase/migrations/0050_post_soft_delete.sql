-- Reliable post soft-delete for feed authors (Edit → Delete).
-- Mirrors soft_delete_companion: explicit WITH CHECK so deleted_at can be set.

drop policy if exists posts_update_own on public.posts;

create policy posts_update_own on public.posts
  for update to authenticated
  using (author_user_id = auth.uid() and deleted_at is null)
  with check (author_user_id = auth.uid());

create or replace function public.soft_delete_post(p_post_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  update public.posts
  set deleted_at = now(),
      edited_at = coalesce(edited_at, now())
  where id = p_post_id
    and author_user_id = auth.uid()
    and deleted_at is null;

  get diagnostics v_rows = row_count;
  return json_build_object('ok', v_rows > 0);
end;
$$;

revoke all on function public.soft_delete_post(uuid) from public;
grant execute on function public.soft_delete_post(uuid) to authenticated;
