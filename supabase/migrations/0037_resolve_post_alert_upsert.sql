-- resolve_post_alert must work even when post_alerts row was never created
-- (e.g. alert insert failed during post creation).

CREATE OR REPLACE FUNCTION public.resolve_post_alert(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind alert_kind_enum;
BEGIN
  SELECT CASE
    WHEN label = 'found' THEN 'found'::alert_kind_enum
    ELSE 'lost'::alert_kind_enum
  END
  INTO v_kind
  FROM posts
  WHERE id = p_post_id
    AND author_user_id = auth.uid()
    AND deleted_at IS NULL;

  IF v_kind IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO post_alerts (post_id, kind, resolved)
  VALUES (p_post_id, v_kind, true)
  ON CONFLICT (post_id) DO UPDATE
  SET resolved = EXCLUDED.resolved;
END;
$$;
