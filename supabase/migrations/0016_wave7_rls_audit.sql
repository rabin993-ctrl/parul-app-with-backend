-- 0016_wave7_rls_audit.sql — Wave 7 RLS Security Audit Fixes
-- Identified gaps from static analysis of all prior migrations (0001–0015).
-- Date: 2026-06-13
--
-- GAP 1 (CRITICAL): posts.posts_select_auth lets every authenticated user read
--   every non-deleted post, including circle-private posts (circle_id IS NOT NULL)
--   and posts by authors whose post_visibility = 'only_me' or 'circles'.
--   Attacker scenario #1 and #7 both PASS before this migration.
--
-- GAP 2 (FUNCTIONAL): circle_messages and circle_message_media have RLS enabled
--   with zero policies → deny-all today. Circle chat is broken for all users.
--   This is a fails-closed functional regression, not a data-leak, but we add
--   member-gated policies here to restore it correctly.
--
-- GAP 3 (LATENT): treat_gifts_select's show_treats_on_profile branch does
--   SELECT from user_privacy_settings via a plain EXISTS subquery. That subquery
--   hits the ups_all_self policy (own-row-only) so the branch returns false for
--   every owner except the calling user, making the clause dead. The advisor-
--   confirmed fix is a SECURITY DEFINER helper.
--
-- GAP 4 (FUNCTIONAL/LATENT): thread_participants_select (0005) contains a
--   self-referential EXISTS subquery: it queries thread_participants (aliased tp2)
--   from within a policy ON thread_participants. Static analysis shows this matches
--   the pattern that caused 42P17 infinite recursion in 0009 for circle_members.
--   DM writes go through SECURITY DEFINER RPCs so the DM feature appears to work,
--   but any direct SELECT on thread_participants by the authenticated role would
--   trigger recursion. Fix: drop the policy and replace it with one that calls the
--   new is_thread_participant() SECURITY DEFINER helper (same 0010 pattern).
--
-- All fixes use SECURITY DEFINER helpers (pattern established in 0010 and 0013)
-- to avoid self-referential RLS recursion.

-- ════════════════════════════════════════════════════════════════════════════
-- GAP 4 FIX: is_thread_participant helper
-- thread_participants_select (0005) queries thread_participants from within a
-- policy ON thread_participants — identical self-referential pattern that caused
-- 42P17 recursion in 0009 for circle_members. A SECURITY DEFINER helper avoids
-- the recursion. threads_select, messages_select, and message_media_select also
-- query thread_participants via EXISTS subqueries; since those policies are on
-- DIFFERENT tables they do not self-recurse and are left unchanged — fixing the
-- base table policy here is sufficient to break the recursion chain.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.is_thread_participant(p_thread uuid)
returns boolean
language sql security definer set search_path = public stable as $$
  select exists(
    select 1 from thread_participants
    where thread_id = p_thread
      and user_id   = auth.uid()
  );
$$;

-- Drop and recreate thread_participants_select using the helper
drop policy if exists thread_participants_select on thread_participants;

create policy thread_participants_select on thread_participants
  for select to authenticated using (
    is_thread_participant(thread_id)
  );

-- ════════════════════════════════════════════════════════════════════════════
-- Helper: get_post_visibility
-- Returns the post_visibility setting for a given user (bypasses ups_all_self).
-- Defaults to 'everyone' if no privacy row exists.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.get_post_visibility(p_user_id uuid)
returns profile_visibility_enum
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select post_visibility from user_privacy_settings where user_id = p_user_id),
    'everyone'::profile_visibility_enum
  );
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Helper: shares_circle_with
-- Returns true if auth.uid() is a member of ANY circle that p_user_id also
-- belongs to. Used for post_visibility = 'circles' on non-circle posts.
-- SECURITY DEFINER bypasses circle_members RLS.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.shares_circle_with(p_user_id uuid)
returns boolean
language sql security definer set search_path = public stable as $$
  select exists(
    select 1
    from circle_members cm1
    join circle_members cm2 on cm2.circle_id = cm1.circle_id
    where cm1.user_id = auth.uid()
      and cm2.user_id = p_user_id
  );
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Helper: show_treats_on_profile
-- Returns the show_treats_on_profile flag for a given user.
-- Defaults to true if no privacy row exists (matches Wave 0 default).
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.get_show_treats_on_profile(p_user_id uuid)
returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select show_treats_on_profile from user_privacy_settings where user_id = p_user_id),
    true
  );
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- GAP 1 FIX: Replace posts_select_auth with a visibility-aware policy
-- ════════════════════════════════════════════════════════════════════════════
drop policy if exists posts_select_auth on posts;

-- New policy enforces:
--   (a) Author always sees their own non-deleted posts.
--   (b) Circle posts (circle_id IS NOT NULL): visible only to circle members.
--   (c) Non-circle posts: visible per the author's post_visibility setting:
--       - 'everyone'  → any authenticated user
--       - 'circles'   → only users who share at least one circle with the author
--       - 'only_me'   → only the author (covered by clause a)
create policy posts_select_visibility on posts
  for select to authenticated using (
    deleted_at is null
    and (
      -- Author always sees own posts
      author_user_id = auth.uid()

      -- Circle-tagged post: must be a member of that circle
      or (
        circle_id is not null
        and is_circle_member(circle_id)
      )

      -- Non-circle post: apply author's post_visibility setting
      or (
        circle_id is null
        and (
          get_post_visibility(author_user_id) = 'everyone'
          or (
            get_post_visibility(author_user_id) = 'circles'
            and shares_circle_with(author_user_id)
          )
          -- 'only_me' falls through to the author clause above only
        )
      )
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- GAP 1 CHILD-TABLE FIX: comments_select_auth does not inherit post visibility
-- Comments on a private post remain readable without this fix.
-- ════════════════════════════════════════════════════════════════════════════
drop policy if exists comments_select_auth on comments;

create policy comments_select_visibility on comments
  for select to authenticated using (
    deleted_at is null
    and exists (
      select 1 from posts p
      where p.id = comments.post_id
        and p.deleted_at is null
        -- Inline the same visibility logic (posts RLS is already filtered, but we
        -- re-check here so comment visibility tracks post visibility exactly).
        and (
          p.author_user_id = auth.uid()
          or (
            p.circle_id is not null
            and is_circle_member(p.circle_id)
          )
          or (
            p.circle_id is null
            and (
              get_post_visibility(p.author_user_id) = 'everyone'
              or (
                get_post_visibility(p.author_user_id) = 'circles'
                and shares_circle_with(p.author_user_id)
              )
            )
          )
        )
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- GAP 2 FIX: circle_messages — add member-gated policies
-- Before this migration: RLS enabled, zero policies → deny-all (broken chat).
-- ════════════════════════════════════════════════════════════════════════════

-- SELECT: only circle members can read messages (non-deleted)
create policy circle_messages_select_member on circle_messages
  for select to authenticated using (
    deleted_at is null
    and is_circle_member(circle_id)
  );

-- INSERT: only circle members can send messages
create policy circle_messages_insert_member on circle_messages
  for insert to authenticated with check (
    sender_user_id = auth.uid()
    and is_circle_member(circle_id)
  );

-- UPDATE: only the sender can edit their own message (pin/delete is soft via UPDATE)
create policy circle_messages_update_own on circle_messages
  for update to authenticated using (
    sender_user_id = auth.uid()
    and is_circle_member(circle_id)
  );

-- ════════════════════════════════════════════════════════════════════════════
-- GAP 2 CHILD: circle_message_media — member-gated policies
-- ════════════════════════════════════════════════════════════════════════════

create policy circle_message_media_select_member on circle_message_media
  for select to authenticated using (
    is_circle_member(circle_id)
  );

create policy circle_message_media_insert_member on circle_message_media
  for insert to authenticated with check (
    is_circle_member(circle_id)
  );

-- ════════════════════════════════════════════════════════════════════════════
-- GAP 3 FIX: Replace treat_gifts_select with one using the definer helper
-- so the show_treats_on_profile branch actually works
-- ════════════════════════════════════════════════════════════════════════════
drop policy if exists treat_gifts_select on treat_gifts;

create policy treat_gifts_select on treat_gifts
  for select to authenticated using (
    from_user_id = auth.uid()
    or owner_id = auth.uid()
    or get_show_treats_on_profile(owner_id)
  );
