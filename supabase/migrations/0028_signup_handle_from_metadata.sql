-- 0028_signup_handle_from_metadata.sql
-- Update handle_new_user trigger to prefer the handle supplied in user_metadata
-- during sign-up. Falls back to the email-prefix auto-generation when absent.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  base_handle  text;
  final_handle text;
  n int := 0;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'display_name', ''),
    split_part(coalesce(new.email, 'friend'), '@', 1)
  );

  -- Prefer caller-supplied handle from metadata; fall back to email prefix.
  base_handle := coalesce(
    nullif(regexp_replace(lower(new.raw_user_meta_data->>'handle'), '[^a-z0-9_]', '', 'g'), ''),
    regexp_replace(lower(split_part(coalesce(new.email, 'user'), '@', 1)), '[^a-z0-9_]', '', 'g')
  );
  if base_handle = '' then base_handle := 'user'; end if;

  final_handle := base_handle;
  while exists (select 1 from public.users where handle = final_handle) loop
    n := n + 1;
    final_handle := base_handle || n::text;
  end loop;

  insert into public.users (id, handle, name, email)
  values (new.id, final_handle, display_name, new.email)
  on conflict (id) do nothing;

  insert into public.user_privacy_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.treat_wallets (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
