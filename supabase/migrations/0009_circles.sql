-- 0009_circles.sql: RLS policies, RPCs, and seed data for Paw Circles
-- ════════════════════════════════════════════════════════════════════════════

-- Allow system-seeded catalog circles (no individual owner)
alter table circles alter column created_by drop not null;

-- External slug for static catalog compatibility (slug-based IDs in the app)
alter table circles add column if not exists slug text unique;

-- ── Seed static catalog circles ─────────────────────────────────────────────
-- These match the SEEDED_CIRCLE_DB_IDS map in PawCircleContext.tsx
insert into circles (id, name, location, icon, tint, icon_bg, tagline, privacy, slug) values
  ('11111111-1111-1111-1111-000000000001', 'Dhanmondi Paw Circle',   'Dhanmondi, Dhaka',    'paw',      '#F2972E', '#FFE8CC', 'Pet lovers near you',           'open', 'dhanmondi'),
  ('11111111-1111-1111-1111-000000000002', 'Cat Parents',            'Banani, Dhaka',       'cat',      '#7A5AE0', '#EDE8FC', 'Tips, meetups & cat care',      'open', 'cat-parents'),
  ('11111111-1111-1111-1111-000000000003', 'Rabbit Lovers',          'Old Dhaka',           'dog',      '#14A697', '#D6F5EE', 'Small pet parents unite',       'open', 'rabbit-lovers'),
  ('11111111-1111-1111-1111-000000000004', 'Pet Rescue',             'Uttara, Dhaka',       'adoption', '#D9489A', '#FCE4F0', 'Foster, adopt & volunteer',     'open', 'pet-rescue'),
  ('11111111-1111-1111-1111-000000000005', 'Senior Paws Dhaka',      'Mohammadpur, Dhaka',  'heart',    '#7A5AE0', '#EDE8FC', 'Care for older companions',     'open', 'senior-paws'),
  ('11111111-1111-1111-1111-000000000006', 'Dhanmondi Dog Walkers',  'Dhanmondi, Dhaka',    'mapPin',   '#7C5CBF', '#F0EBFA', 'Morning walks & park playdates','open', 'bandra-walkers'),
  ('11111111-1111-1111-1111-000000000007', 'Indie Rescue Network',   'Gulshan, Dhaka',      'shield',   '#E5424F', '#FFE8E8', 'Street dog rescue & rehoming',  'open', 'indie-rescue')
on conflict (slug) do nothing;

-- ── Realtime ─────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table circles;
alter publication supabase_realtime add table circle_members;
alter publication supabase_realtime add table circle_join_requests;

-- ── RLS: circles ─────────────────────────────────────────────────────────────
-- All non-deleted circles are visible (discovery is intentionally public)
create policy "circles_select_active" on circles
  for select using (deleted_at is null);

-- Only authenticated users can create circles (must set themselves as owner)
create policy "circles_insert_own" on circles
  for insert with check (created_by = auth.uid());

-- Only the creator can edit
create policy "circles_update_own" on circles
  for update using (created_by = auth.uid());

-- Only the creator can delete
create policy "circles_delete_own" on circles
  for delete using (created_by = auth.uid());

-- ── RLS: circle_members ───────────────────────────────────────────────────────
-- Members of a circle can see each other; users can always see their own rows
create policy "circle_members_select" on circle_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from circle_members cm2
      where cm2.circle_id = circle_members.circle_id
        and cm2.user_id = auth.uid()
    )
  );

-- Users can join open circles directly (private circles go through join requests)
create policy "circle_members_insert_open" on circle_members
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from circles
      where id = circle_id and privacy = 'open'
    )
  );

-- Users can leave (delete their own membership)
create policy "circle_members_delete_self" on circle_members
  for delete using (user_id = auth.uid());

-- ── RLS: circle_join_requests ─────────────────────────────────────────────────
-- Requester sees their own; circle admin sees incoming requests
create policy "circle_join_requests_select" on circle_join_requests
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from circle_members cm
      where cm.circle_id = circle_join_requests.circle_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
  );

-- Users can submit a join request for themselves
create policy "circle_join_requests_insert" on circle_join_requests
  for insert with check (user_id = auth.uid());

-- Admins can approve or decline (state update)
create policy "circle_join_requests_update_admin" on circle_join_requests
  for update using (
    exists (
      select 1 from circle_members cm
      where cm.circle_id = circle_join_requests.circle_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
  );

-- ── RPCs ──────────────────────────────────────────────────────────────────────

-- create_circle: insert circle + add creator as admin; return {id, slug}
create or replace function create_circle(
  p_name     text,
  p_location text,
  p_privacy  circle_privacy_enum default 'open'
)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_id      uuid;
  v_slug    text;
  v_base    text;
  v_counter int := 0;
begin
  v_base := lower(regexp_replace(trim(p_name), '[^a-z0-9]+', '-', 'gi'));
  v_base := regexp_replace(v_base, '^-+|-+$', '', 'g');
  if v_base = '' then v_base := 'circle'; end if;
  v_slug := v_base;
  loop
    exit when not exists (select 1 from circles where slug = v_slug);
    v_counter := v_counter + 1;
    v_slug := v_base || '-' || v_counter;
    if v_counter > 200 then raise exception 'could not generate unique slug for: %', p_name; end if;
  end loop;

  insert into circles (name, location, privacy, created_by, slug, icon, tint, icon_bg)
  values (trim(p_name), trim(p_location), p_privacy, auth.uid(), v_slug, 'paw', '#7C5CBF', '#F0EBFA')
  returning id into v_id;

  insert into circle_members (circle_id, user_id, role)
  values (v_id, auth.uid(), 'admin');

  return json_build_object('id', v_id, 'slug', v_slug);
end; $$;

-- join_circle: add user as member to an open circle
create or replace function join_circle(p_circle_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into circle_members (circle_id, user_id, role)
  values (p_circle_id, auth.uid(), 'member')
  on conflict (circle_id, user_id) do nothing;
end; $$;

-- leave_circle: remove user from a circle
create or replace function leave_circle(p_circle_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from circle_members where circle_id = p_circle_id and user_id = auth.uid();
end; $$;

-- send_circle_request: create join request + notify circle admins
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

-- accept_circle_request: approve request + add member + notify requester
create or replace function accept_circle_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_circle_id    uuid;
  v_requester_id uuid;
  v_circle_name  text;
begin
  select circle_id, user_id
  into   v_circle_id, v_requester_id
  from   circle_join_requests
  where  id = p_request_id and state = 'pending';

  if not found then
    raise exception 'circle request not found or already handled (id=%)', p_request_id;
  end if;

  if not exists (
    select 1 from circle_members
    where  circle_id = v_circle_id
      and  user_id   = auth.uid()
      and  role      = 'admin'
  ) then
    raise exception 'only circle admins can accept requests';
  end if;

  update circle_join_requests set state = 'approved' where id = p_request_id;

  insert into circle_members (circle_id, user_id, role)
  values (v_circle_id, v_requester_id, 'member')
  on conflict (circle_id, user_id) do nothing;

  select name into v_circle_name from circles where id = v_circle_id;

  insert into notifications (
    recipient_id, type, actor_user_id,
    entity_type, entity_id,
    title, body, data
  ) values (
    v_requester_id,
    'circle_accept',
    auth.uid(),
    'circle',
    v_circle_id,
    'Your request was accepted',
    'You''re now a member of ' || coalesce(v_circle_name, 'the circle') || '.',
    jsonb_build_object('circle_id', v_circle_id)
  );
end; $$;

-- decline_circle_request: reject request (no notification sent)
create or replace function decline_circle_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_circle_id uuid;
begin
  select circle_id
  into   v_circle_id
  from   circle_join_requests
  where  id = p_request_id and state = 'pending';

  if not found then
    raise exception 'circle request not found or already handled (id=%)', p_request_id;
  end if;

  if not exists (
    select 1 from circle_members
    where  circle_id = v_circle_id
      and  user_id   = auth.uid()
      and  role      = 'admin'
  ) then
    raise exception 'only circle admins can decline requests';
  end if;

  update circle_join_requests set state = 'rejected' where id = p_request_id;
end; $$;
