-- 0051_circle_invites.sql: outbound circle invites + invited_by on join requests

-- Track who referred a join request (member invite → invitee accepted → admin queue)
alter table circle_join_requests
  add column if not exists invited_by_user_id uuid references users(id) on delete set null;

create table if not exists circle_invites (
  id               uuid primary key default gen_random_uuid(),
  circle_id        uuid not null references circles(id) on delete cascade,
  inviter_user_id  uuid not null references users(id) on delete cascade,
  invitee_user_id  uuid not null references users(id) on delete cascade,
  state            request_state_enum not null default 'pending',
  created_at       timestamptz not null default now(),
  unique (circle_id, invitee_user_id)
);

create index if not exists circle_invites_invitee_pending_idx
  on circle_invites (invitee_user_id)
  where state = 'pending';

alter table circle_invites enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'circle_invites'
  ) then
    alter publication supabase_realtime add table circle_invites;
  end if;
end $$;

-- Inviter or invitee can read their invites; circle admins can read invites for their circle
drop policy if exists "circle_invites_select" on circle_invites;
create policy "circle_invites_select" on circle_invites
  for select using (
    inviter_user_id = auth.uid()
    or invitee_user_id = auth.uid()
    or exists (
      select 1 from circle_members cm
      where cm.circle_id = circle_invites.circle_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
  );

-- Inserts go through SECURITY DEFINER RPC only
drop policy if exists "circle_invites_no_direct_insert" on circle_invites;
create policy "circle_invites_no_direct_insert" on circle_invites
  for insert with check (false);

drop policy if exists "circle_invites_no_direct_update" on circle_invites;
create policy "circle_invites_no_direct_update" on circle_invites
  for update using (false);

-- send_circle_invite: member invites another user to a circle
create or replace function send_circle_invite(
  p_circle_id       uuid,
  p_invitee_user_id uuid
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_invite_id      uuid;
  v_inviter_name   text;
  v_invitee_name   text;
  v_circle_name    text;
  v_privacy        circle_privacy_enum;
  v_inviter_role   member_role_enum;
begin
  if p_invitee_user_id = auth.uid() then
    raise exception 'cannot invite yourself';
  end if;

  if not exists (
    select 1 from circles
    where id = p_circle_id and deleted_at is null
  ) then
    raise exception 'circle not found';
  end if;

  select role into v_inviter_role
  from circle_members
  where circle_id = p_circle_id and user_id = auth.uid();

  if not found then
    raise exception 'only circle members can send invites';
  end if;

  if exists (
    select 1 from circle_members
    where circle_id = p_circle_id and user_id = p_invitee_user_id
  ) then
    raise exception 'user is already a member of this circle';
  end if;

  if exists (
    select 1 from circle_invites
    where circle_id = p_circle_id
      and invitee_user_id = p_invitee_user_id
      and state = 'pending'
  ) then
    raise exception 'invite already sent';
  end if;

  insert into circle_invites (circle_id, inviter_user_id, invitee_user_id)
  values (p_circle_id, auth.uid(), p_invitee_user_id)
  on conflict (circle_id, invitee_user_id) do update
    set state = 'pending',
        inviter_user_id = auth.uid(),
        created_at = now()
  returning id into v_invite_id;

  select name, privacy into v_circle_name, v_privacy from circles where id = p_circle_id;
  select name into v_inviter_name from users where id = auth.uid();
  select name into v_invitee_name from users where id = p_invitee_user_id;

  insert into notifications (
    recipient_id, type, actor_user_id,
    entity_type, entity_id,
    title, body, data
  ) values (
    p_invitee_user_id,
    'circle_invite',
    auth.uid(),
    'circle_invite',
    v_invite_id,
    coalesce(v_inviter_name, 'Someone') || ' invited you to ' || coalesce(v_circle_name, 'a Paw Circle'),
    case
      when v_privacy = 'request' and v_inviter_role <> 'admin'
        then 'You''ll need admin approval to join. Tap Accept or Decline to respond.'
      else 'Tap Accept or Decline to respond.'
    end,
    jsonb_build_object(
      'circle_id', p_circle_id,
      'invite_id', v_invite_id,
      'circle_name', v_circle_name,
      'requires_admin_approval', (v_privacy = 'request' and v_inviter_role <> 'admin')
    )
  );

  return v_invite_id;
end; $$;

-- accept_circle_invite: invitee accepts — direct join or join-request depending on role/privacy
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
    -- Admin invite or open circle: direct membership
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
    -- Member invite on request-privacy circle: create join request for admin approval
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
          note = excluded.note
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

-- decline_circle_invite: invitee declines
create or replace function decline_circle_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update circle_invites
  set state = 'rejected'
  where id = p_invite_id
    and invitee_user_id = auth.uid()
    and state = 'pending';

  if not found then
    raise exception 'invite not found or already handled (id=%)', p_invite_id;
  end if;
end; $$;
