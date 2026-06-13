-- 0017_pg_cron_keepalive.sql
-- Prevents the free-tier project from pausing (pauses after 7 days inactivity).
-- Requires pg_cron extension — enable in Dashboard → Database → Extensions if not already enabled.
-- This migration is safe to apply even if pg_cron isn't available yet; it will error gracefully.

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'parul-keepalive',
      '0 6 * * *',   -- 6am UTC daily (12pm Bangladesh Standard Time)
      'select 1'
    );
  end if;
end
$$;
