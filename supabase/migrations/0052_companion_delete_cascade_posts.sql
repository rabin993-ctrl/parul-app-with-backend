-- When an owner soft-deletes a companion, also soft-delete their feed posts
-- authored as or tagged with that companion.

create or replace function public.soft_delete_companion(p_companion_id uuid)
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

  -- Posts authored as this companion.
  update public.posts
  set deleted_at = now(),
      edited_at = coalesce(edited_at, now())
  where companion_author_id = p_companion_id
    and author_user_id = auth.uid()
    and deleted_at is null;

  -- Posts tagged "with" this companion.
  update public.posts p
  set deleted_at = now(),
      edited_at = coalesce(edited_at, now())
  where p.author_user_id = auth.uid()
    and p.deleted_at is null
    and exists (
      select 1
      from public.post_companions pc
      where pc.post_id = p.id
        and pc.companion_id = p_companion_id
    );

  update public.companions
  set deleted_at = now(),
      updated_at = now()
  where id = p_companion_id
    and owner_id = auth.uid()
    and deleted_at is null;

  get diagnostics v_rows = row_count;
  return json_build_object('ok', v_rows > 0);
end;
$$;
