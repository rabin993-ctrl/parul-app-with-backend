-- Circle profile photo (optional), same media_assets pattern as users/companions.

alter table circles
  add column if not exists avatar_media_id uuid;

alter table circles
  add constraint circles_avatar_media_id_fkey
  foreign key (avatar_media_id) references media_assets(id) on delete set null not valid;

alter table circles validate constraint circles_avatar_media_id_fkey;

create index if not exists idx_circles_avatar_media_id on public.circles (avatar_media_id);

-- Postgres cannot change RETURNS TABLE shape via CREATE OR REPLACE.
drop function if exists public.list_discoverable_circles();

create function list_discoverable_circles()
returns table (
  id               uuid,
  slug             text,
  name             text,
  location         text,
  icon             text,
  tint             text,
  icon_bg          text,
  tagline          text,
  bio              text,
  tags             text[],
  privacy          circle_privacy_enum,
  created_by       uuid,
  member_count     bigint,
  avatar_media_id  uuid,
  avatar_url       text,
  avatar_thumb_url text
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
    count(cm.user_id)::bigint as member_count,
    c.avatar_media_id,
    ma.url as avatar_url,
    ma.thumb_url as avatar_thumb_url
  from circles c
  left join circle_members cm on cm.circle_id = c.id
  left join media_assets ma on ma.id = c.avatar_media_id
  where c.deleted_at is null
  group by c.id, ma.url, ma.thumb_url
  order by count(cm.user_id) desc, c.name;
$$;
