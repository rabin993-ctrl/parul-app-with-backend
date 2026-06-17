-- 0038_db_fixes.sql — fix three issues found auditing the live database.
--
-- 1) Duplicate propose_adoption overload (live, breaking bug).
--    Migration 0024 used `create or replace function propose_adoption(... p_request_id ...)`
--    with an EXTRA parameter, so it created a NEW 8-arg overload instead of replacing the
--    original 7-arg version — both now coexist. The app calls the RPC with
--    `p_request_id: requestId || undefined`; JSON serialization drops undefined keys, so
--    when there is no request id the payload carries exactly 7 named args. That arg set
--    matches BOTH overloads (the 8th is defaulted), so PostgREST cannot disambiguate and
--    returns PGRST203 "Could not choose the best candidate function" — the adoption
--    proposal fails. Drop the stale 7-arg version; the 8-arg one defaults p_request_id.
--
-- 2) SECURITY DEFINER functions with a mutable search_path (security hardening).
--    Eight definer-rights adoption RPCs have no `search_path` pinned (39 other definer
--    functions already do). A mutable search_path lets a caller shadow `public` objects
--    and run code with the definer's elevated privileges. Pin search_path = public.
--
-- 3) community_post_saves.user_id pointed at auth.users(id) (schema inconsistency).
--    Every other user foreign key in the schema references public.users(id); this lone
--    one referenced auth.users(id), breaking PostgREST embedding to public.users and
--    diverging from the rest of the model. Repoint it (table currently has 0 rows).

-- ── 1. Remove the stale 7-arg propose_adoption overload ──────────────────────
drop function if exists public.propose_adoption(uuid, uuid, text, text, text, text, uuid);

-- ── 2. Pin search_path on the remaining SECURITY DEFINER adoption RPCs ────────
alter function public.adopter_respond(uuid, text)                                   set search_path = public;
alter function public.approve_adoption_request(uuid)                                set search_path = public;
alter function public.confirm_adoption(uuid)                                        set search_path = public;
alter function public.do_milestone_sweep()                                          set search_path = public;
alter function public.endorse_adopter(uuid, text, text)                             set search_path = public;
alter function public.post_adoption_update(uuid, text, text, text, integer, boolean) set search_path = public;
alter function public.propose_adoption(uuid, uuid, text, text, text, text, uuid, uuid) set search_path = public;
alter function public.reject_adoption_request(uuid)                                 set search_path = public;

-- ── 3. Repoint community_post_saves.user_id at public.users ──────────────────
alter table public.community_post_saves
  drop constraint if exists community_post_saves_user_id_fkey;
alter table public.community_post_saves
  add constraint community_post_saves_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;
