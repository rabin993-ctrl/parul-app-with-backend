-- Reliable post_alerts upsert for lost/found posts (bypasses RLS edge cases on upsert).

CREATE OR REPLACE FUNCTION public.save_post_alert(
  p_post_id uuid,
  p_kind alert_kind_enum,
  p_area text DEFAULT NULL,
  p_last_seen text DEFAULT NULL,
  p_found_at text DEFAULT NULL,
  p_looks_like text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_resolved boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM posts
    WHERE id = p_post_id
      AND author_user_id = auth.uid()
      AND deleted_at IS NULL
  ) THEN
    RETURN;
  END IF;

  INSERT INTO post_alerts (
    post_id,
    kind,
    area,
    last_seen,
    found_at,
    looks_like,
    phone,
    lat,
    lng,
    resolved
  )
  VALUES (
    p_post_id,
    p_kind,
    NULLIF(trim(p_area), ''),
    NULLIF(trim(p_last_seen), ''),
    NULLIF(trim(p_found_at), ''),
    NULLIF(trim(p_looks_like), ''),
    NULLIF(trim(p_phone), ''),
    p_lat,
    p_lng,
    COALESCE(p_resolved, false)
  )
  ON CONFLICT (post_id) DO UPDATE SET
    kind = EXCLUDED.kind,
    area = EXCLUDED.area,
    last_seen = EXCLUDED.last_seen,
    found_at = EXCLUDED.found_at,
    looks_like = EXCLUDED.looks_like,
    phone = EXCLUDED.phone,
    lat = COALESCE(EXCLUDED.lat, post_alerts.lat),
    lng = COALESCE(EXCLUDED.lng, post_alerts.lng),
    resolved = EXCLUDED.resolved;
END;
$$;
