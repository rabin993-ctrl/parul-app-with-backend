-- 0018_circles_discovery.sql
-- DB-driven circle discovery: adds list_discoverable_circles() RPC and removes
-- the 7 seeded demo circles so Explore shows only real user-created circles.

-- SECURITY DEFINER so the member COUNT aggregation works even for circles the
-- caller hasn't joined (RLS on circle_members would otherwise block it).
create or replace function list_discoverable_circles()
returns table (
  id           uuid,
  slug         text,
  name         text,
  location     text,
  icon         text,
  tint         text,
  icon_bg      text,
  tagline      text,
  bio          text,
  tags         text[],
  privacy      circle_privacy_enum,
  created_by   uuid,
  member_count bigint
) language sql security definer set search_path = public as $$
  select
    c.id,
    c.slug,
    c.name,
    c.location,
    c.icon,
    c.tint,
    c.icon_bg,
    c.tagline,
    c.bio,
    coalesce(c.tags, '{}') as tags,
    c.privacy,
    c.created_by,
    count(cm.user_id)::bigint as member_count
  from circles c
  left join circle_members cm on cm.circle_id = c.id
  where c.deleted_at is null
  group by c.id
  order by count(cm.user_id) desc, c.name;
$$;

-- Remove the 7 static demo circles. Circle members and join requests cascade
-- via the ON DELETE CASCADE foreign keys already in place.
delete from circles where id in (
  '11111111-1111-1111-1111-000000000001',
  '11111111-1111-1111-1111-000000000002',
  '11111111-1111-1111-1111-000000000003',
  '11111111-1111-1111-1111-000000000004',
  '11111111-1111-1111-1111-000000000005',
  '11111111-1111-1111-1111-000000000006',
  '11111111-1111-1111-1111-000000000007'
);
