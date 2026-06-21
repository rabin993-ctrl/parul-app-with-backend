-- 0072_vault_edge_function_urls.sql
-- Remove dependence on hardcoded project refs (zoezppkypxogylwypdwu) in trigger bodies.
--
-- After this migration:
--   • Project API base URL is stored in Vault as supabase_project_url (auto-detected from
--     auth.instances on hosted Supabase, or synced from legacy fan_out_alert_url).
--   • Edge function URLs are derived: <base>/functions/v1/<name>
--   • Bearer token is read from Vault edge_function_token (fallback: fan_out_alert_token).
--
-- Fresh install on a new Supabase project:
--   1. npm run db:push
--   2. npm run db:seed-vault   (stores anon key in Vault from .env)
--   3. npm run fn:deploy
--
-- If push/notify edge calls still no-op, set edge_function_token in Dashboard → Vault
-- to your project's anon key (Settings → API).

-- ── Detect project API base (https://<ref>.supabase.co) ─────────────────────

create or replace function public.parul_detect_project_api_base()
returns text
language plpgsql
security definer
set search_path = public, vault, auth, pg_temp
as $$
declare
  v_base text;
  v_uri text;
  v_ref text;
  v_config text;
begin
  select rtrim(decrypted_secret, '/')
  into v_base
  from vault.decrypted_secrets
  where name = 'supabase_project_url'
  limit 1;

  if v_base is not null and v_base <> '' then
    return v_base;
  end if;

  begin
    select raw_base_config into v_config from auth.instances limit 1;
    if v_config is not null and v_config <> '' then
      if v_config like '{%' then
        v_uri := coalesce(
          v_config::jsonb->>'URI',
          v_config::jsonb->>'api_external_url',
          v_config::jsonb->>'APIExternalURL'
        );
      else
        v_uri := v_config;
      end if;

      if v_uri is not null then
        v_ref := substring(v_uri from 'https://([a-z0-9]{10,})\.supabase\.co');
        if v_ref is not null then
          return 'https://' || v_ref || '.supabase.co';
        end if;

        v_base := regexp_replace(v_uri, '/auth/v1/?$', '');
        if v_base ~ '^https://[a-z0-9]+\.supabase\.co$' then
          return v_base;
        end if;
      end if;
    end if;
  exception when others then
    null;
  end;

  select regexp_replace(rtrim(decrypted_secret, '/'), '/functions/v1/[^/]+$', '')
  into v_base
  from vault.decrypted_secrets
  where name = 'fan_out_alert_url'
  limit 1;

  if v_base is not null
     and v_base ~ '^https://[a-z0-9]+\.supabase\.co$'
     and v_base not like '%zoezppkypxogylwypdwu%' then
    return v_base;
  end if;

  return null;
end;
$$;

-- ── Vault token + URL helpers ───────────────────────────────────────────────

create or replace function public.parul_edge_function_token()
returns text
language sql
security definer
stable
set search_path = public, vault
as $$
  select coalesce(
    (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_token' limit 1),
    (select decrypted_secret from vault.decrypted_secrets where name = 'fan_out_alert_token' limit 1)
  );
$$;

create or replace function public.parul_edge_function_url(p_function_name text)
returns text
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_base text;
begin
  v_base := public.parul_detect_project_api_base();
  if v_base is null or p_function_name is null or btrim(p_function_name) = '' then
    return null;
  end if;
  return v_base || '/functions/v1/' || btrim(p_function_name);
end;
$$;

-- Callable from npm run db:seed-vault to store the anon key without manual SQL.
create or replace function public.parul_set_edge_function_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'parul_set_edge_function_token: token must not be empty';
  end if;

  if exists (select 1 from vault.secrets where name = 'edge_function_token') then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'edge_function_token'),
      btrim(p_token)
    );
  else
    perform vault.create_secret(
      btrim(p_token),
      'edge_function_token',
      'Bearer token for pg_net calls to Supabase Edge Functions (anon key)'
    );
  end if;

  -- Keep legacy secret in sync for any external tooling still reading it.
  if exists (select 1 from vault.secrets where name = 'fan_out_alert_token') then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'fan_out_alert_token'),
      btrim(p_token)
    );
  elsif not exists (select 1 from vault.secrets where name = 'fan_out_alert_token') then
    perform vault.create_secret(
      btrim(p_token),
      'fan_out_alert_token',
      'Legacy alias of edge_function_token'
    );
  end if;
end;
$$;

-- ── Seed / refresh Vault URLs for this linked project ───────────────────────

create or replace function public.parul_seed_vault_edge_secrets()
returns void
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  v_base text;
  v_fan_out_url text;
begin
  v_base := public.parul_detect_project_api_base();
  if v_base is null then
    raise notice 'parul_seed_vault_edge_secrets: could not detect project API base URL';
    return;
  end if;

  if not exists (select 1 from vault.secrets where name = 'supabase_project_url') then
    perform vault.create_secret(
      v_base,
      'supabase_project_url',
      'Parul project API base URL (https://<ref>.supabase.co)'
    );
  else
    perform vault.update_secret(
      (select id from vault.secrets where name = 'supabase_project_url'),
      v_base
    );
  end if;

  v_fan_out_url := v_base || '/functions/v1/fan-out-alert';

  if not exists (select 1 from vault.secrets where name = 'fan_out_alert_url') then
    perform vault.create_secret(
      v_fan_out_url,
      'fan_out_alert_url',
      'Legacy full URL for fan-out-alert (derived from supabase_project_url)'
    );
  else
    perform vault.update_secret(
      (select id from vault.secrets where name = 'fan_out_alert_url'),
      v_fan_out_url
    );
  end if;
end;
$$;

select public.parul_seed_vault_edge_secrets();

-- ── Push notifications: notify edge function ────────────────────────────────

create or replace function public.trigger_notify_push()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_url   text;
  v_token text;
begin
  v_url := public.parul_edge_function_url('notify');
  v_token := public.parul_edge_function_token();

  if v_url is null or v_token is null then
    return new;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_token
    ),
    body    := jsonb_build_object('notification_id', new.id)
  );
  return new;
exception when others then
  return new;
end;
$$;

-- ── Geo alerts: DB fan-out + edge fallback (latest behaviour from 0046) ─────

create or replace function public.trigger_fan_out_post_alert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_url   text;
  v_token text;
begin
  if new.resolved then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.lat is null or new.lng is null then
      return new;
    end if;
    if old.lat is not distinct from new.lat and old.lng is not distinct from new.lng then
      return new;
    end if;
  end if;

  if new.lat is not null and new.lng is not null then
    begin
      perform public.fan_out_post_alert(new.post_id);
    exception when others then
      raise warning 'fan_out_post_alert failed for post %: %', new.post_id, sqlerrm;
    end;
    return new;
  end if;

  v_url := public.parul_edge_function_url('fan-out-alert');
  v_token := public.parul_edge_function_token();

  if v_url is not null and v_token is not null then
    begin
      perform net.http_post(
        url     := v_url,
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || v_token
        ),
        body    := jsonb_build_object('post_id', new.post_id)
      );
    exception when others then
      null;
    end;
  end if;

  return new;
exception when others then
  return new;
end;
$$;
