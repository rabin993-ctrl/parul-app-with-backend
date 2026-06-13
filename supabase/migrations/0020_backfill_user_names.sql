-- Backfill null name values: set name = handle for users whose name was never
-- populated (accounts created before the handle_new_user trigger was in place,
-- or created via pathways that didn't provide raw_user_meta_data->>'name').
update users
set name = handle
where name is null or name = '';

-- Also update the trigger so future sign-ups always have a non-null name.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  display_name text;
  base_handle  text;
  final_handle text;
  n            int := 0;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'display_name', ''),
    split_part(coalesce(new.email, 'friend'), '@', 1)
  );
  base_handle := regexp_replace(lower(split_part(coalesce(new.email, 'user'), '@', 1)), '[^a-z0-9_]', '', 'g');
  if base_handle = '' then base_handle := 'user'; end if;
  final_handle := base_handle;
  while exists (select 1 from public.users where handle = final_handle) loop
    n := n + 1;
    final_handle := base_handle || n::text;
  end loop;

  insert into public.users (id, handle, name, email)
  values (new.id, final_handle, coalesce(display_name, final_handle), new.email)
  on conflict (id) do nothing;

  insert into public.user_privacy_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.treat_wallets (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
