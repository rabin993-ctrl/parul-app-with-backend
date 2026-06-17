-- 0040_fan_out_secret_vault.sql
-- Move the fan-out edge-function URL + bearer token out of the trigger body into Vault.
--
-- 0035 hardcoded the Authorization bearer (the project's *anon* key — a public client
-- key, not a high-value secret) directly inside trigger_fan_out_post_alert(). Even so,
-- inlining it means: it shows up in pg_proc / function diffs, and rotating it requires a
-- code change + redeploy. This migration moves it into Supabase Vault so the function
-- reads it at call time and the value can be rotated with vault.update_secret() alone.
--
-- The secret is seeded by EXTRACTING it from the currently-installed function body, so
-- the literal is never re-typed into this file. (Idempotent: skips if already seeded.)

do $$
declare
  v_url   text;
  v_token text;
begin
  select substring(prosrc from 'url := ''([^'']+)''')
    into v_url
    from pg_proc where proname = 'trigger_fan_out_post_alert';

  select substring(prosrc from 'Bearer ([A-Za-z0-9._-]+)')
    into v_token
    from pg_proc where proname = 'trigger_fan_out_post_alert';

  if v_url is not null and not exists (select 1 from vault.secrets where name = 'fan_out_alert_url') then
    perform vault.create_secret(v_url, 'fan_out_alert_url', 'fan-out-alert edge function URL');
  end if;

  if v_token is not null and not exists (select 1 from vault.secrets where name = 'fan_out_alert_token') then
    perform vault.create_secret(v_token, 'fan_out_alert_token', 'Bearer token for fan-out-alert edge function (rotate with vault.update_secret)');
  end if;
end $$;

-- Redefine the trigger to read URL + token from Vault instead of inlining them.
create or replace function public.trigger_fan_out_post_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url   text;
  v_token text;
begin
  select decrypted_secret into v_url   from vault.decrypted_secrets where name = 'fan_out_alert_url';
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'fan_out_alert_token';

  -- Not configured (e.g. secrets not seeded on a fresh project) → skip quietly.
  if v_url is null or v_token is null then
    return new;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_token
    ),
    body    := jsonb_build_object('post_id', new.post_id)
  );
  return new;
exception when others then
  return new;
end;
$$;
