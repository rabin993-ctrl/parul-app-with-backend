-- Wave 5: Notifications + Push
-- 1. Missing UPDATE policy so mark-as-read calls in useAdoptionRequests / useAdoptionRecords work
-- 2. Add notifications table to realtime publication
-- 3. RLS policies for push_tokens (table exists but has no policies → default-deny)
-- 4. mark_all_notifications_read() RPC

-- ────────────────────────────────────────────────────────────────────────────
-- 1.  notifications — UPDATE policy (critical fix)
-- ────────────────────────────────────────────────────────────────────────────
create policy "notifications_update_own" on notifications
  for update using (recipient_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- 2.  Add notifications to realtime so INSERT events reach clients
-- ────────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table notifications;

-- ────────────────────────────────────────────────────────────────────────────
-- 3.  push_tokens — RLS policies (table has RLS enabled, zero policies)
-- ────────────────────────────────────────────────────────────────────────────
create policy "push_tokens_select_own" on push_tokens
  for select using (user_id = auth.uid());

create policy "push_tokens_insert_own" on push_tokens
  for insert with check (user_id = auth.uid());

create policy "push_tokens_delete_own" on push_tokens
  for delete using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- 4.  RPC: mark_all_notifications_read
--     Marks every unread notification for auth.uid() as read in one shot.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function mark_all_notifications_read()
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update notifications
     set read = true
   where recipient_id = auth.uid()
     and read = false;
end;
$$;
