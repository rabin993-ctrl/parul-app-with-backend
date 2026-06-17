-- 0042_user_delete_owner_fk_cascade.sql
-- Allow account deletion to fully cascade through domain tables.
--
-- Root cause:
-- circles.created_by and communities.created_by were defined without an
-- explicit ON DELETE action (default NO ACTION), which blocks deleting a user
-- from auth.users/public.users when they own circles or communities.
--
-- Fix:
-- Recreate both FKs with ON DELETE CASCADE so owned rows are removed with the
-- account, matching the existing cascade strategy used across most tables.

ALTER TABLE public.circles
  DROP CONSTRAINT IF EXISTS circles_created_by_fkey;

ALTER TABLE public.circles
  ADD CONSTRAINT circles_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

ALTER TABLE public.communities
  DROP CONSTRAINT IF EXISTS communities_created_by_fkey;

ALTER TABLE public.communities
  ADD CONSTRAINT communities_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.users(id)
  ON DELETE CASCADE;
