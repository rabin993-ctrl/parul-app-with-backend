-- 0015_circle_remove_member.sql: Admin-only RPC to remove a member from a circle
-- ════════════════════════════════════════════════════════════════════════════

-- remove_circle_member: caller must be an admin; cannot remove self (use leave_circle)
create or replace function remove_circle_member(
  p_circle_id uuid,
  p_user_id   uuid
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from circle_members
    where circle_id = p_circle_id
      and user_id   = auth.uid()
      and role      = 'admin'
  ) then
    raise exception 'only circle admins can remove members';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'use leave_circle to remove yourself';
  end if;

  delete from circle_members
  where circle_id = p_circle_id
    and user_id   = p_user_id;
end; $$;
