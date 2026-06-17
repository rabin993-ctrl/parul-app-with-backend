-- Improve lost/found alert fan-out: match on stored coords + notification pref only,
-- and re-run fan-out when alert coordinates are backfilled on UPDATE.

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

-- Re-run fan-out when coordinates are first set or corrected after insert.
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
  IF TG_OP = 'UPDATE' THEN
    IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
      RETURN NEW;
    END IF;
    IF OLD.lat IS NOT DISTINCT FROM NEW.lat AND OLD.lng IS NOT DISTINCT FROM NEW.lng THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT decrypted_secret INTO v_url   FROM vault.decrypted_secrets WHERE name = 'fan_out_alert_url';
  SELECT decrypted_secret INTO v_token FROM vault.decrypted_secrets WHERE name = 'fan_out_alert_token';

  IF v_url IS NULL OR v_token IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_token
    ),
    body    := jsonb_build_object('post_id', NEW.post_id)
  );
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
