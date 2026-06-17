-- Let the post author invoke geo fan-out directly from the app (reliable fallback
-- when the pg_net trigger or fan-out-alert edge function is misconfigured).

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

GRANT EXECUTE ON FUNCTION public.fan_out_my_post_alert(uuid) TO authenticated;
