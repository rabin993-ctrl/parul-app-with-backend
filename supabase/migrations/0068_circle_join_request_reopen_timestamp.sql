-- When a join request is re-opened (declined user re-requests, invite → admin queue),
-- bump created_at so "time ago" reflects when the admin was notified again.

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
    set state = 'pending',
        note = excluded.note,
        created_at = now()
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

create or replace function accept_circle_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_circle_id        uuid;
  v_inviter_id       uuid;
  v_inviter_role     member_role_enum;
  v_privacy          circle_privacy_enum;
  v_circle_name      text;
  v_invitee_name     text;
  v_request_id       uuid;
  v_admin_id         uuid;
  v_actor_name       text;
begin
  select ci.circle_id, ci.inviter_user_id, c.privacy, c.name
  into   v_circle_id, v_inviter_id, v_privacy, v_circle_name
  from   circle_invites ci
  join   circles c on c.id = ci.circle_id
  where  ci.id = p_invite_id
    and  ci.invitee_user_id = auth.uid()
    and  ci.state = 'pending'
    and  c.deleted_at is null;

  if not found then
    raise exception 'invite not found or already handled (id=%)', p_invite_id;
  end if;

  if not exists (
    select 1 from circle_members
    where circle_id = v_circle_id and user_id = v_inviter_id
  ) then
    raise exception 'invite is no longer valid';
  end if;

  if exists (
    select 1 from circle_members
    where circle_id = v_circle_id and user_id = auth.uid()
  ) then
    update circle_invites set state = 'approved' where id = p_invite_id;
    return;
  end if;

  select role into v_inviter_role
  from circle_members
  where circle_id = v_circle_id and user_id = v_inviter_id;

  update circle_invites set state = 'approved' where id = p_invite_id;

  if v_inviter_role = 'admin' or v_privacy = 'open' then
    insert into circle_members (circle_id, user_id, role)
    values (v_circle_id, auth.uid(), 'member')
    on conflict (circle_id, user_id) do nothing;

    update circle_join_requests
    set state = 'approved'
    where circle_id = v_circle_id
      and user_id = auth.uid()
      and state = 'pending';

    insert into notifications (
      recipient_id, type, actor_user_id,
      entity_type, entity_id,
      title, body, data
    ) values (
      auth.uid(),
      'circle_accept',
      v_inviter_id,
      'circle',
      v_circle_id,
      'You''re in!',
      'You''re now a member of ' || coalesce(v_circle_name, 'the circle') || '.',
      jsonb_build_object('circle_id', v_circle_id, 'circle_name', v_circle_name)
    );
  else
    insert into circle_join_requests (circle_id, user_id, invited_by_user_id, note)
    values (
      v_circle_id,
      auth.uid(),
      v_inviter_id,
      'Invited by a member'
    )
    on conflict (circle_id, user_id) do update
      set state = 'pending',
          invited_by_user_id = excluded.invited_by_user_id,
          note = excluded.note,
          created_at = now()
    returning id into v_request_id;

    select name into v_actor_name from users where id = auth.uid();

    for v_admin_id in
      select user_id from circle_members
      where circle_id = v_circle_id and role = 'admin'
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
        'Invited by a member. Tap Accept or Ignore to respond.',
        jsonb_build_object(
          'circle_id', v_circle_id,
          'request_id', v_request_id,
          'invited_by_user_id', v_inviter_id
        )
      );
    end loop;
  end if;
end; $$;

-- Repair pending rows that were re-notified but still carry an old created_at.
update circle_join_requests cjr
set created_at = n.latest_at
from (
  select entity_id::uuid as request_id, max(created_at) as latest_at
  from notifications
  where type = 'circle_request'
    and entity_type = 'circle_join_request'
  group by entity_id
) n
where cjr.id = n.request_id
  and cjr.state = 'pending'
  and n.latest_at > cjr.created_at;
