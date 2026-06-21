-- Reliable mark-circle-read for circle chat previews (security definer).

create or replace function mark_circle_read(p_circle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update circle_members
     set last_read_at = now()
   where circle_id = p_circle_id
     and user_id = auth.uid();
end;
$$;

grant execute on function mark_circle_read(uuid) to authenticated;
