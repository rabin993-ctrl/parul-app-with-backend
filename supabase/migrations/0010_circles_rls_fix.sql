-- 0010_circles_rls_fix.sql: Fix self-referential RLS recursion in circle_members policies
-- A policy whose USING clause subqueries the same table causes Postgres to raise
-- "42P17: infinite recursion detected in policy for relation" at query time.
-- The fix: security-definer helpers bypass RLS internally, breaking the loop.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function is_circle_member(p_circle uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists(
    select 1 from circle_members
    where circle_id = p_circle and user_id = auth.uid()
  );
$$;

create or replace function is_circle_admin(p_circle uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists(
    select 1 from circle_members
    where circle_id = p_circle and user_id = auth.uid() and role = 'admin'
  );
$$;

-- Drop and recreate the three policies from 0009 that caused recursion
drop policy if exists "circle_members_select"              on circle_members;
drop policy if exists "circle_join_requests_select"        on circle_join_requests;
drop policy if exists "circle_join_requests_update_admin"  on circle_join_requests;

-- Members of a circle can see each other; users always see their own rows
create policy "circle_members_select" on circle_members
  for select using (
    user_id = auth.uid() or is_circle_member(circle_id)
  );

-- Requesters see their own requests; admins see requests to their circles
create policy "circle_join_requests_select" on circle_join_requests
  for select using (
    user_id = auth.uid() or is_circle_admin(circle_id)
  );

-- Only admins can approve/decline (state update)
create policy "circle_join_requests_update_admin" on circle_join_requests
  for update using (is_circle_admin(circle_id));
