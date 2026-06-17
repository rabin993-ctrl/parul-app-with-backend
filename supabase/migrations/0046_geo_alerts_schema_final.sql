-- Geo alert schema: idempotent final state for db reset / fresh installs.
-- Ensures PostGIS fan-out, in-database trigger, and app RPCs work without Vault
-- secrets or edge-function configuration.

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- ── Columns (no-op if already applied via 0035) ─────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lng double precision,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

ALTER TABLE post_alerts
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS alerted_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alert_radius_km numeric(6, 2) NOT NULL DEFAULT 10;

ALTER TABLE post_alerts
  ALTER COLUMN alert_radius_km SET DEFAULT 10;

-- ── fan_out_post_alert: PostGIS radius match (extensions.geography) ───────────
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
        extensions.ST_SetSRID(extensions.ST_MakePoint(u.location_lng, u.location_lat), 4326)::extensions.geography,
        extensions.ST_SetSRID(extensions.ST_MakePoint(v_lng, v_lat), 4326)::extensions.geography,
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

-- ── Trigger: fan out in-database when alert coordinates are written ───────────
CREATE OR REPLACE FUNCTION public.trigger_fan_out_post_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url   text;
  v_token text;
BEGIN
  IF NEW.resolved THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
      RETURN NEW;
    END IF;
    IF OLD.lat IS NOT DISTINCT FROM NEW.lat AND OLD.lng IS NOT DISTINCT FROM NEW.lng THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    BEGIN
      PERFORM fan_out_post_alert(NEW.post_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fan_out_post_alert failed for post %: %', NEW.post_id, SQLERRM;
    END;
    RETURN NEW;
  END IF;

  -- Optional fallback: edge function geocodes when coordinates are still missing.
  SELECT decrypted_secret INTO v_url   FROM vault.decrypted_secrets WHERE name = 'fan_out_alert_url';
  SELECT decrypted_secret INTO v_token FROM vault.decrypted_secrets WHERE name = 'fan_out_alert_token';

  IF v_url IS NOT NULL AND v_token IS NOT NULL THEN
    BEGIN
      PERFORM net.http_post(
        url     := v_url,
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || v_token
        ),
        body    := jsonb_build_object('post_id', NEW.post_id)
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fan_out_post_alert ON post_alerts;

CREATE TRIGGER trg_fan_out_post_alert
  AFTER INSERT OR UPDATE OF lat, lng ON post_alerts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_fan_out_post_alert();

-- ── App RPC: author invokes fan-out (backup to trigger) ─────────────────────
CREATE OR REPLACE FUNCTION public.fan_out_my_post_alert(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM posts p
    WHERE p.id = p_post_id
      AND p.author_user_id = auth.uid()
      AND p.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN fan_out_post_alert(p_post_id);
END;
$$;

-- ── Coordinate helpers ──────────────────────────────────────────────────────
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

-- ── Grants ──────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.update_user_location(double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_post_alert_coordinates(uuid, double precision, double precision, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fan_out_my_post_alert(uuid) TO authenticated;

-- Spatial indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_users_location_geo
  ON users USING gist (
    extensions.ST_SetSRID(extensions.ST_MakePoint(location_lng, location_lat), 4326)
  )
  WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_post_alerts_geo
  ON post_alerts USING gist (
    extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)
  )
  WHERE lat IS NOT NULL AND lng IS NOT NULL;
