-- Promote the avatar_media_id FKs from NOT VALID to fully enforced.
-- PostgREST uses validated FK constraints for embedded resource resolution.
ALTER TABLE users VALIDATE CONSTRAINT users_avatar_media_id_fkey;
ALTER TABLE companions VALIDATE CONSTRAINT companions_avatar_media_id_fkey;
