-- Verify migration 0071 online presence RPCs (run in Supabase SQL editor).
-- Replace <user-a-uuid> with the user who should appear online.

-- 1) RPCs exist?
select proname from pg_proc
where proname in ('get_public_user_privacy_flags', 'touch_online_presence');

-- 2) Heartbeat writing?
select id, online_last_seen, now() - online_last_seen as age
from users where id = '<user-a-uuid>';

-- 3) What peers receive via client RPC
select * from get_public_user_privacy_flags(array['<user-a-uuid>'::uuid]);
