-- 0012_pg_net_enable.sql: Ensure pg_net extension is present for push trigger.
-- pg_net is available on Supabase managed projects but must be explicitly enabled.
-- trigger_notify_push() (created in 0011) calls net.http_post at runtime; if the
-- extension is absent the trigger silently swallows the error and push never fires.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pg_net with schema extensions;
