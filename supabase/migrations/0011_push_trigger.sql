-- 0011_push_trigger.sql: Fire the notify Edge Function on every notification INSERT
-- Uses pg_net (built-in on Supabase managed projects) to make an async HTTP call
-- to the edge function. The trigger function is SECURITY DEFINER and traps all
-- exceptions so a push failure never rolls back the notification row.
-- The anon key and project URL are intentionally public values (same as the app).
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
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZXpwcGt5cHhvZ3lsd3lwZHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDIyODQsImV4cCI6MjA5Njg3ODI4NH0._HxwRAGMFmyko0MgnTYg15rpSfUFl3VQOay5BDWEJiY"}'::jsonb,
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
