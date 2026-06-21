-- Wire up profile privacy settings: helpers, access gates, search, feed flags, online presence.

-- ════════════════════════════════════════════════════════════════════════════
-- Privacy setting helpers (mirror get_post_visibility / get_show_treats_on_profile)
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.get_profile_visibility(p_user_id uuid)
returns profile_visibility_enum
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select profile_visibility from user_privacy_settings where user_id = p_user_id),
    'everyone'::profile_visibility_enum
  );
$$;

create or replace function public.get_user_show_location(p_user_id uuid)
returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select show_location from user_privacy_settings where user_id = p_user_id),
    true
  );
$$;

create or replace function public.get_user_show_companions(p_user_id uuid)
returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select show_companions from user_privacy_settings where user_id = p_user_id),
    true
  );
$$;

create or replace function public.get_user_show_online(p_user_id uuid)
returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select show_online from user_privacy_settings where user_id = p_user_id),
    true
  );
$$;

create or replace function public.get_user_discoverable(p_user_id uuid)
returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select discoverable from user_privacy_settings where user_id = p_user_id),
    true
  );
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Profile visibility gate
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.can_view_user_profile(p_target uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_vis profile_visibility_enum;
begin
  if p_target is null then
    return false;
  end if;

  if p_target = auth.uid() then
    return true;
  end if;

  v_vis := get_profile_visibility(p_target);

  case v_vis
    when 'everyone' then
      return true;
    when 'circles' then
      return shares_circle_with(p_target);
    when 'only_me' then
      return false;
    else
      return true;
  end case;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Discoverable user search
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.search_discoverable_users(
  p_query text,
  p_limit int default 40
)
returns table (
  id uuid,
  name text,
  handle text,
  tint text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pattern text;
begin
  if p_query is null or btrim(p_query) = '' then
    return;
  end if;

  v_pattern := '%' || p_query || '%';

  return query
  select u.id, u.name, u.handle, u.tint
  from users u
  where (
    get_user_discoverable(u.id) = true
    or u.id = auth.uid()
  )
  and (
    u.name ilike v_pattern
    or u.handle ilike v_pattern
  )
  order by u.name
  limit coalesce(p_limit, 40);
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Batch public privacy flags for feed / UI (no private settings leaked)
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.get_public_user_privacy_flags(p_user_ids uuid[])
returns table (
  user_id uuid,
  show_location boolean,
  show_companions boolean,
  show_online boolean,
  is_online boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_ids is null or coalesce(array_length(p_user_ids, 1), 0) = 0 then
    return;
  end if;

  return query
  select distinct
    u.id as user_id,
    get_user_show_location(u.id) as show_location,
    get_user_show_companions(u.id) as show_companions,
    get_user_show_online(u.id) as show_online,
    (
      get_user_show_online(u.id)
      and u.online_last_seen is not null
      and u.online_last_seen > (now() - interval '5 minutes')
    ) as is_online
  from unnest(p_user_ids) as uid
  join users u on u.id = uid;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Online presence heartbeat (only writes when caller's show_online is true)
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.touch_online_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if get_user_show_online(auth.uid()) then
    update users
       set online_last_seen = now()
     where id = auth.uid();
  end if;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Fix start_dm: enforce message_policy = 'circles'
-- ════════════════════════════════════════════════════════════════════════════

create or replace function start_dm(p_other_user_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_policy      message_policy_enum;
  v_thread_id   uuid;
begin
  if p_other_user_id is null then
    raise exception 'p_other_user_id must not be null';
  end if;

  if p_other_user_id = auth.uid() then
    raise exception 'Cannot start a DM with yourself';
  end if;

  select message_policy
    into v_policy
    from user_privacy_settings
   where user_id = p_other_user_id;

  if found then
    case v_policy
      when 'none' then
        raise exception 'This user does not accept messages';
      when 'circles' then
        if not shares_circle_with(p_other_user_id) then
          raise exception 'This user only accepts messages from circle members';
        end if;
      else
        null;
    end case;
  end if;

  if exists (
    select 1 from blocked_users
     where (blocker_id = auth.uid()      and blocked_id = p_other_user_id)
        or (blocker_id = p_other_user_id and blocked_id = auth.uid())
  ) then
    raise exception 'Cannot message a blocked user';
  end if;

  select tp1.thread_id
    into v_thread_id
    from thread_participants tp1
    join thread_participants tp2
      on tp2.thread_id = tp1.thread_id
     and tp2.user_id   = p_other_user_id
    join threads t
      on t.id = tp1.thread_id
     and t.type = 'dm'
   where tp1.user_id = auth.uid()
   limit 1;

  if v_thread_id is null then
    insert into threads (type)
    values ('dm')
    returning id into v_thread_id;

    insert into thread_participants (thread_id, user_id)
    values (v_thread_id, auth.uid()),
           (v_thread_id, p_other_user_id)
    on conflict (thread_id, user_id) do nothing;
  end if;

  return v_thread_id;
end;
$$;

grant execute on function public.get_profile_visibility(uuid) to authenticated;
grant execute on function public.get_user_show_location(uuid) to authenticated;
grant execute on function public.get_user_show_companions(uuid) to authenticated;
grant execute on function public.get_user_show_online(uuid) to authenticated;
grant execute on function public.get_user_discoverable(uuid) to authenticated;
grant execute on function public.can_view_user_profile(uuid) to authenticated;
grant execute on function public.search_discoverable_users(text, int) to authenticated;
grant execute on function public.get_public_user_privacy_flags(uuid[]) to authenticated;
grant execute on function public.touch_online_presence() to authenticated;