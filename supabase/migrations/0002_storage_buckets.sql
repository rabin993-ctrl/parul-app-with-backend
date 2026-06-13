-- 0002_storage_buckets.sql — Storage buckets + RLS (Wave 0)
-- Creates the five media buckets and baseline storage policies.
-- avatars / post-media: public read (CDN-safe).
-- adoption-media / rescue-media / circle-media: authenticated read only (signed URLs);
-- privacy is refined per domain in Waves 3–6.
-- Write is always own-path-only: path must start with the uploader's auth.uid().

-- ────────────────────────────────────────────────────────────────────────────
-- Buckets
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',        'avatars',        true,  5242880,
   ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('post-media',     'post-media',     true,  10485760,
   ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4']),
  ('adoption-media', 'adoption-media', false, 10485760,
   ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('rescue-media',   'rescue-media',   false, 10485760,
   ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('circle-media',   'circle-media',   false, 10485760,
   ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- avatars — public read, authenticated own-path write
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "avatars_public_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text);

-- ────────────────────────────────────────────────────────────────────────────
-- post-media — public read, authenticated own-path write
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "post_media_public_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

CREATE POLICY "post_media_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "post_media_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "post_media_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-media'
    AND (storage.foldername(name))[1] = auth.uid()::text);

-- ────────────────────────────────────────────────────────────────────────────
-- adoption-media — authenticated read (Wave 3 refines to poster+adopter);
--                  own-path write
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "adoption_media_select_auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'adoption-media');

CREATE POLICY "adoption_media_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'adoption-media'
    AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "adoption_media_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'adoption-media'
    AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "adoption_media_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'adoption-media'
    AND (storage.foldername(name))[1] = auth.uid()::text);

-- ────────────────────────────────────────────────────────────────────────────
-- rescue-media — authenticated read (Wave 4 refines); own-path write
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "rescue_media_select_auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rescue-media');

CREATE POLICY "rescue_media_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rescue-media'
    AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "rescue_media_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'rescue-media'
    AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "rescue_media_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'rescue-media'
    AND (storage.foldername(name))[1] = auth.uid()::text);

-- ────────────────────────────────────────────────────────────────────────────
-- circle-media — authenticated read (Wave 6 refines to members); own-path write
-- ────────────────────────────────────────────────────────────────────────────
CREATE POLICY "circle_media_select_auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'circle-media');

CREATE POLICY "circle_media_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'circle-media'
    AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "circle_media_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'circle-media'
    AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "circle_media_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'circle-media'
    AND (storage.foldername(name))[1] = auth.uid()::text);
