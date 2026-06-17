-- Run geo fan-out inside PostgreSQL when post_alerts is written.
-- The previous trigger only called the edge function via pg_net + Vault secrets,
-- which silently no-ops when secrets are missing or the HTTP call fails.
-- Manual "SELECT fan_out_post_alert(...)" in SQL editor worked because it bypassed that path.

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

  -- Primary path: same as running fan_out_post_alert in the SQL editor.
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    BEGIN
      PERFORM fan_out_post_alert(NEW.post_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fan_out_post_alert failed for post %: %', NEW.post_id, SQLERRM;
    END;
    RETURN NEW;
  END IF;

  -- Fallback when coordinates are missing: edge function can geocode then fan out.
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
