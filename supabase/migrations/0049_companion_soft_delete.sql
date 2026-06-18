-- Reliable companion soft-delete for owners (used by profile Edit → remove).
-- Also tighten UPDATE policy so deleted_at can be set without RLS edge cases.

drop policy if exists companions_update_own on public.companions;

create policy companions_update_own on public.companions
  for update to authenticated
  using (owner_id = auth.uid() and deleted_at is null)
  with check (owner_id = auth.uid());

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

revoke all on function public.soft_delete_companion(uuid) from public;
grant execute on function public.soft_delete_companion(uuid) to authenticated;
