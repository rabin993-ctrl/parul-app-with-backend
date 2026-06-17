-- 0011_push_trigger.sql: Fire the notify Edge Function on every notification INSERT
-- Uses pg_net (built-in on Supabase managed projects) to make an async HTTP call
-- to the edge function. The trigger function is SECURITY DEFINER and traps all
-- exceptions so a push failure never rolls back the notification row.
-- The bearer token is read from Supabase Vault (secret `fan_out_alert_token`) instead
-- of being inlined; provision it on fresh installs via vault.create_secret(...). The
-- project URL is a public value (same as the app), so it stays inline.
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- Trigger function
-- ────────────────────────────────────────────────────────────────────────────
create or replace function trigger_notify_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url     := 'https://zoezppkypxogylwypdwu.supabase.co/functions/v1/notify',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'fan_out_alert_token')),
    body    := jsonb_build_object('notification_id', NEW.id)
  );
  return NEW;
exception when others then
  -- Never fail a notification insert because of push delivery issues
  return NEW;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Attach trigger to notifications table
-- ────────────────────────────────────────────────────────────────────────────
drop trigger if exists trg_notification_push on notifications;

create trigger trg_notification_push
  after insert on notifications
  for each row
  execute function trigger_notify_push();
