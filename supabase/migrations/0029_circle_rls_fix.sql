-- 0029_circle_rls_fix.sql
-- Fix self-referential RLS recursion on circle_members (same pattern as
-- is_community_member in 0013_community_rls.sql). The original
-- circle_members_select policy queried circle_members inside a
-- circle_members policy, causing infinite recursion in Supabase which
-- silently returned empty results for member-count aggregate queries.

-- SECURITY DEFINER helper — bypasses RLS so the check doesn't recurse.
-- Use parameter name "p_circle" to match the existing function signature in the DB.
create or replace function public.is_circle_member(p_circle uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from circle_members
    where circle_id = p_circle and user_id = auth.uid()
  );
$$;

-- Replace the self-referential policy with one that uses the helper.
drop policy if exists "circle_members_select" on circle_members;

create policy "circle_members_select" on circle_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or is_circle_member(circle_id)
  );

-- Backfill community member_count for any communities whose members joined
-- before the trigger in 0013 existed (member_count would be stuck at 0).
update communities c
set member_count = sub.cnt
from (
  select community_id, count(*) as cnt
  from community_members
  group by community_id
) sub
where c.id = sub.community_id
  and c.member_count = 0;
