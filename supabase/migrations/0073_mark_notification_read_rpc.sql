-- Reliable mark-one-read for the notifications inbox (security definer, same pattern as mark_all).

create or replace function mark_notification_read(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update notifications
     set read = true
   where id = p_id
     and recipient_id = auth.uid()
     and read = false;
end;
$$;

grant execute on function mark_notification_read(uuid) to authenticated;
