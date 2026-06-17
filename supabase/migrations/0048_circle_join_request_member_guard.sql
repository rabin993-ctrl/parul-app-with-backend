-- Prevent join requests from users who are already circle members (including
-- creators/admins who accidentally requested their own circle).

-- Clear stale pending requests where the requester is already a member.
update circle_join_requests cjr
set state = 'approved'
from circle_members cm
where cjr.circle_id = cm.circle_id
  and cjr.user_id = cm.user_id
  and cjr.state = 'pending';

create or replace function send_circle_request(
  p_circle_id uuid,
  p_note      text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_request_id uuid;
  v_actor_name text;
  v_admin_id   uuid;
begin
  if exists (
    select 1 from circle_members
    where circle_id = p_circle_id and user_id = auth.uid()
  ) then
    raise exception 'already a member of this circle';
  end if;

  insert into circle_join_requests (circle_id, user_id, note)
  values (p_circle_id, auth.uid(), p_note)
  on conflict (circle_id, user_id) do update
    set state = 'pending', note = excluded.note
  returning id into v_request_id;

  select name into v_actor_name from users where id = auth.uid();

  for v_admin_id in
    select user_id from circle_members
    where circle_id = p_circle_id and role = 'admin'
  loop
    insert into notifications (
      recipient_id, type, actor_user_id,
      entity_type, entity_id,
      title, body, data
    ) values (
      v_admin_id,
      'circle_request',
      auth.uid(),
      'circle_join_request',
      v_request_id,
      coalesce(v_actor_name, 'Someone') || ' wants to join your circle',
      'Tap Accept or Ignore to respond.',
      jsonb_build_object('circle_id', p_circle_id, 'request_id', v_request_id)
    );
  end loop;

  return v_request_id;
end; $$;
