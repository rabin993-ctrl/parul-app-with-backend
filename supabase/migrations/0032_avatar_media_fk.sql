-- Add FK constraints so PostgREST can resolve avatar_media inline joins.
-- NOT VALID skips scanning existing rows (safe even if orphaned references exist).
ALTER TABLE users
  ADD CONSTRAINT users_avatar_media_id_fkey
  FOREIGN KEY (avatar_media_id) REFERENCES media_assets(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE companions
  ADD CONSTRAINT companions_avatar_media_id_fkey
  FOREIGN KEY (avatar_media_id) REFERENCES media_assets(id) ON DELETE SET NULL NOT VALID;
