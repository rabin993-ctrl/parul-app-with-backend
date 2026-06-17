-- 0035_geo_post_alerts.sql
-- Geo-based lost/found alert fan-out with PostGIS radius matching.

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- ── User coordinates (for nearby matching) ───────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lng double precision,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_users_location_geo
  ON users USING gist (
    extensions.ST_SetSRID(extensions.ST_MakePoint(location_lng, location_lat), 4326)
  )
  WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL AND deleted_at IS NULL;

-- ── Alert coordinates + delivery counter ─────────────────────────────────────
ALTER TABLE post_alerts
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS alerted_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alert_radius_km numeric(6, 2) NOT NULL DEFAULT 10;

CREATE INDEX IF NOT EXISTS idx_post_alerts_geo
  ON post_alerts USING gist (
    extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)
  )
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- ── Delivery log (dedupe + audit) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_alert_deliveries (
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE post_alert_deliveries ENABLE ROW LEVEL SECURITY;

-- ── Persist alert coordinates (author or service role) ───────────────────────
CREATE OR REPLACE FUNCTION public.set_post_alert_coordinates(
  p_post_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_radius_km numeric DEFAULT 10
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL THEN
    RETURN;
  END IF;
  IF p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'invalid coordinates';
  END IF;

  UPDATE post_alerts pa
  SET
    lat = p_lat,
    lng = p_lng,
    alert_radius_km = COALESCE(p_radius_km, pa.alert_radius_km)
  WHERE pa.post_id = p_post_id
    AND EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = p_post_id
        AND p.deleted_at IS NULL
        AND (p.author_user_id = auth.uid() OR auth.role() = 'service_role')
    );
END;
$$;

-- ── Update signed-in user coordinates ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_user_location(
  p_lat double precision,
  p_lng double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL THEN
    RETURN;
  END IF;
  IF p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'invalid coordinates';
  END IF;

  UPDATE users
  SET
    location_lat = p_lat,
    location_lng = p_lng,
    location_updated_at = now()
  WHERE id = auth.uid();
END;
$$;

-- ── Fan-out: notify users within radius via PostGIS ──────────────────────────
CREATE OR REPLACE FUNCTION public.fan_out_post_alert(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lat double precision;
  v_lng double precision;
  v_radius_km numeric;
  v_kind text;
  v_author uuid;
  v_area text;
  v_resolved boolean;
  v_inserted integer;
  v_total integer;
BEGIN
  SELECT pa.lat, pa.lng, pa.alert_radius_km, pa.kind, pa.area, pa.resolved, p.author_user_id
  INTO v_lat, v_lng, v_radius_km, v_kind, v_area, v_resolved, v_author
  FROM post_alerts pa
  INNER JOIN posts p ON p.id = pa.post_id
  WHERE pa.post_id = p_post_id
    AND p.deleted_at IS NULL;

  IF NOT FOUND OR v_resolved OR v_lat IS NULL OR v_lng IS NULL THEN
    RETURN jsonb_build_object('alerted', 0, 'skipped', true);
  END IF;

  WITH nearby AS (
    SELECT u.id AS user_id
    FROM users u
    INNER JOIN user_privacy_settings ups ON ups.user_id = u.id
    WHERE u.deleted_at IS NULL
      AND u.id <> v_author
      AND u.location_lat IS NOT NULL
      AND u.location_lng IS NOT NULL
      AND ups.show_location = true
      AND ups.notify_post_activity = true
      AND NOT EXISTS (
        SELECT 1 FROM blocked_users b
        WHERE (b.blocker_id = v_author AND b.blocked_id = u.id)
           OR (b.blocker_id = u.id AND b.blocked_id = v_author)
      )
      AND NOT EXISTS (
        SELECT 1 FROM post_alert_deliveries d
        WHERE d.post_id = p_post_id AND d.user_id = u.id
      )
      AND extensions.ST_DWithin(
        extensions.ST_SetSRID(extensions.ST_MakePoint(u.location_lng, u.location_lat), 4326)::geography,
        extensions.ST_SetSRID(extensions.ST_MakePoint(v_lng, v_lat), 4326)::geography,
        v_radius_km * 1000
      )
  ),
  inserted_deliveries AS (
    INSERT INTO post_alert_deliveries (post_id, user_id)
    SELECT p_post_id, nearby.user_id FROM nearby
    ON CONFLICT DO NOTHING
    RETURNING user_id
  ),
  inserted_notifications AS (
    INSERT INTO notifications (
      recipient_id, type, title, body, actor_user_id, entity_type, entity_id, data
    )
    SELECT
      d.user_id,
      CASE WHEN v_kind = 'found' THEN 'found' ELSE 'lost' END,
      CASE WHEN v_kind = 'found' THEN 'Found pet alert nearby' ELSE 'Lost pet alert nearby' END,
      COALESCE(NULLIF(v_area, ''), 'Open the alert for details.'),
      v_author,
      'post',
      p_post_id,
      jsonb_build_object('post_id', p_post_id, 'area', v_area, 'kind', v_kind)
    FROM inserted_deliveries d
    RETURNING recipient_id
  )
  SELECT count(*)::integer INTO v_inserted FROM inserted_notifications;

  UPDATE post_alerts
  SET alerted_count = alerted_count + v_inserted
  WHERE post_id = p_post_id
  RETURNING alerted_count INTO v_total;

  RETURN jsonb_build_object(
    'alerted', v_inserted,
    'total', COALESCE(v_total, 0),
    'skipped', false
  );
END;
$$;

-- ── Trigger: invoke fan-out Edge Function after alert insert ─────────────────
CREATE OR REPLACE FUNCTION public.trigger_fan_out_post_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://zoezppkypxogylwypdwu.supabase.co/functions/v1/fan-out-alert',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'fan_out_alert_token')),
    body := jsonb_build_object('post_id', NEW.post_id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fan_out_post_alert ON post_alerts;

CREATE TRIGGER trg_fan_out_post_alert
  AFTER INSERT ON post_alerts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_fan_out_post_alert();

-- ── Dev seed: approximate Dhaka coordinates for demo users ───────────────────
UPDATE users SET location_lat = 23.7461, location_lng = 90.3742, location_updated_at = now()
WHERE id = 'a1000001-0000-0000-0000-000000000001';

UPDATE users SET location_lat = 23.7925, location_lng = 90.4078, location_updated_at = now()
WHERE id = 'a1000001-0000-0000-0000-000000000002';

UPDATE users SET location_lat = 23.8103, location_lng = 90.4125, location_updated_at = now()
WHERE id = 'a1000001-0000-0000-0000-000000000003';

UPDATE users SET location_lat = 23.8223, location_lng = 90.3654, location_updated_at = now()
WHERE id = 'a1000001-0000-0000-0000-000000000004';

UPDATE users SET location_lat = 23.8759, location_lng = 90.3795, location_updated_at = now()
WHERE id = 'a1000001-0000-0000-0000-000000000005';

UPDATE post_alerts SET lat = 23.8223, lng = 90.3654
WHERE post_id = 'fa000001-0000-0000-0000-000000000005';

UPDATE post_alerts SET lat = 23.7949, lng = 90.4043
WHERE post_id = 'fa000001-0000-0000-0000-000000000009';

GRANT EXECUTE ON FUNCTION public.update_user_location(double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_post_alert_coordinates(uuid, double precision, double precision, numeric) TO authenticated;
