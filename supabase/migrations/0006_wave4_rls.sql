-- Wave 4A: RLS policies for rescue tables
-- Agent B will produce 0006b_messaging_rls.sql; the main agent merges both into 0006_wave4_rls.sql

-- -------------------------------------------------------
-- rescue_cases
-- -------------------------------------------------------
alter table rescue_cases enable row level security;

create policy "rescue_cases_select" on rescue_cases
  for select using (deleted_at is null);

create policy "rescue_cases_insert" on rescue_cases
  for insert with check (poster_user_id = auth.uid());

create policy "rescue_cases_update" on rescue_cases
  for update using (poster_user_id = auth.uid());

create policy "rescue_cases_delete" on rescue_cases
  for delete using (poster_user_id = auth.uid());

-- -------------------------------------------------------
-- rescue_updates
-- -------------------------------------------------------
alter table rescue_updates enable row level security;

create policy "rescue_updates_select" on rescue_updates
  for select using (
    exists (
      select 1 from rescue_cases rc
      where rc.id = rescue_updates.case_id
        and rc.deleted_at is null
    )
  );

create policy "rescue_updates_insert" on rescue_updates
  for insert with check (
    exists (
      select 1 from rescue_cases rc
      where rc.id = rescue_updates.case_id
        and rc.poster_user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- rescue_update_media
-- -------------------------------------------------------
alter table rescue_update_media enable row level security;

create policy "rescue_update_media_select" on rescue_update_media
  for select using (
    exists (
      select 1 from rescue_updates ru
      join rescue_cases rc on rc.id = ru.case_id
      where ru.id = rescue_update_media.update_id
        and rc.deleted_at is null
    )
  );

create policy "rescue_update_media_insert" on rescue_update_media
  for insert with check (
    exists (
      select 1 from rescue_updates ru
      join rescue_cases rc on rc.id = ru.case_id
      where ru.id = rescue_update_media.update_id
        and rc.poster_user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- rescue_case_followers
-- -------------------------------------------------------
alter table rescue_case_followers enable row level security;

-- Anyone can read follower rows (needed for counts and current-user lookup)
create policy "rescue_case_followers_select" on rescue_case_followers
  for select using (true);

create policy "rescue_case_followers_insert" on rescue_case_followers
  for insert with check (user_id = auth.uid());

create policy "rescue_case_followers_delete" on rescue_case_followers
  for delete using (user_id = auth.uid());
-- 0006b_messaging_rls.sql — Wave 4B: Messaging RPCs
-- Policies for threads/thread_participants/messages/message_media were already
-- installed in 0005_wave3_rls.sql.  This migration adds only the three helper
-- functions that the client calls directly:
--
--   start_dm(p_other_user_id)       → uuid (thread id)
--   mark_thread_read(thread, msg)   → void
--   toggle_thread_mute(thread)      → boolean (new muted value)
--
-- All functions are SECURITY DEFINER so they can bypass RLS when acting on
-- behalf of auth.uid(), and set search_path = public to avoid search-path
-- injection.

-- ════════════════════════════════════════════════════════════════════════════
-- RPC: start_dm
-- Finds or creates a DM thread between auth.uid() and p_other_user_id.
-- Checks the target's message_policy and mutual block status first.
-- Returns the thread id.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function start_dm(p_other_user_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_policy      message_policy_enum;
  v_thread_id   uuid;
begin
  -- ── 1. Validate inputs ───────────────────────────────────────────────────
  if p_other_user_id is null then
    raise exception 'p_other_user_id must not be null';
  end if;

  if p_other_user_id = auth.uid() then
    raise exception 'Cannot start a DM with yourself';
  end if;

  -- ── 2. Check the other user's message_policy ─────────────────────────────
  select message_policy
    into v_policy
    from user_privacy_settings
   where user_id = p_other_user_id;

  -- If no row exists we fall through (treat as 'everyone' — safe default).
  if found then
    case v_policy
      when 'none' then
        raise exception 'This user does not accept messages';
      when 'circles' then
        -- TODO (Wave 6): enforce circles membership check here.
        -- For now, treat 'circles' the same as 'everyone'.
        null;
      else
        -- 'everyone': no restriction
        null;
    end case;
  end if;

  -- ── 3. Check blocked_users (either direction) ────────────────────────────
  if exists (
    select 1 from blocked_users
     where (blocker_id = auth.uid()      and blocked_id = p_other_user_id)
        or (blocker_id = p_other_user_id and blocked_id = auth.uid())
  ) then
    raise exception 'Cannot message a blocked user';
  end if;

  -- ── 4. Find an existing DM thread shared by both users ───────────────────
  -- A DM thread is one where BOTH auth.uid() and p_other_user_id appear in
  -- thread_participants and the thread type is 'dm'.
  select tp1.thread_id
    into v_thread_id
    from thread_participants tp1
    join thread_participants tp2
      on tp2.thread_id = tp1.thread_id
     and tp2.user_id   = p_other_user_id
    join threads t
      on t.id = tp1.thread_id
     and t.type = 'dm'
   where tp1.user_id = auth.uid()
   limit 1;

  -- ── 5. Create a new thread if none exists ────────────────────────────────
  if v_thread_id is null then
    insert into threads (type)
    values ('dm')
    returning id into v_thread_id;

    insert into thread_participants (thread_id, user_id)
    values (v_thread_id, auth.uid()),
           (v_thread_id, p_other_user_id)
    on conflict (thread_id, user_id) do nothing;
  end if;

  return v_thread_id;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- RPC: mark_thread_read
-- Updates last_read_message_id for the calling user in a given thread.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function mark_thread_read(
  p_thread_id  uuid,
  p_message_id uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update thread_participants
     set last_read_message_id = p_message_id
   where thread_id = p_thread_id
     and user_id   = auth.uid();

  if not found then
    raise exception 'Not a participant of this thread';
  end if;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- RPC: toggle_thread_mute
-- Flips the muted flag for the calling user in a given thread.
-- Returns the new muted value.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function toggle_thread_mute(p_thread_id uuid)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_new_muted boolean;
begin
  update thread_participants
     set muted = not muted
   where thread_id = p_thread_id
     and user_id   = auth.uid()
  returning muted into v_new_muted;

  if not found then
    raise exception 'Not a participant of this thread';
  end if;

  return v_new_muted;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- reports — anyone can insert their own report; only mods read (admin only).
-- ────────────────────────────────────────────────────────────────────────────
create policy "reports_insert" on reports
  for insert with check (reporter_user_id = auth.uid());
