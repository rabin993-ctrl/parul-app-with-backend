-- Allow members to update their own last_read_at column so the client can mark
-- a circle as read when the user opens it.
create policy "circle_members_update_own" on circle_members
  for update to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());
