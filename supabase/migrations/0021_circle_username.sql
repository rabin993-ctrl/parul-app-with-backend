-- 0021_circle_username.sql
-- Allow callers to specify a custom slug (circle username) when creating a
-- circle. If p_slug is null the existing auto-generation logic runs unchanged.
-- Also adds the slug column constraint for format validation.

alter table circles
  add constraint circles_slug_format
  check (slug ~ '^[a-z0-9][a-z0-9\-]{0,28}[a-z0-9]$' or length(slug) = 1);

create or replace function create_circle(
  p_name     text,
  p_location text,
  p_privacy  circle_privacy_enum default 'open',
  p_slug     text default null
)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_id      uuid;
  v_slug    text;
  v_base    text;
  v_counter int := 0;
begin
  if p_slug is not null then
    -- Normalise caller-supplied slug: lowercase, collapse non-alnum to hyphens
    v_slug := regexp_replace(lower(trim(p_slug)), '[^a-z0-9]+', '-', 'g');
    v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
    if v_slug = '' then raise exception 'circle username cannot be empty'; end if;
    if exists (select 1 from circles where slug = v_slug) then
      raise exception 'circle username "%" is already taken', v_slug;
    end if;
  else
    -- Auto-generate from name (original behaviour)
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
  end if;

  insert into circles (name, location, privacy, created_by, slug, icon, tint, icon_bg)
  values (trim(p_name), trim(p_location), p_privacy, auth.uid(), v_slug, 'paw', '#7C5CBF', '#F0EBFA')
  returning id into v_id;

  insert into circle_members (circle_id, user_id, role)
  values (v_id, auth.uid(), 'admin');

  return json_build_object('id', v_id, 'slug', v_slug);
end; $$;

-- Helper RPC used by the client to check slug availability before submitting
create or replace function check_circle_slug(p_slug text)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'available', not exists (select 1 from circles where slug = p_slug),
    'slug', p_slug
  );
$$;
