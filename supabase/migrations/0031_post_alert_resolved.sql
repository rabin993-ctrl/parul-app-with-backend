-- 0031_post_alert_resolved.sql
-- Add resolved flag to post_alerts so lost/found posts can be marked as
-- returned/found without deleting the original post.

ALTER TABLE post_alerts ADD COLUMN IF NOT EXISTS resolved boolean NOT NULL DEFAULT false;

-- RPC: only the post author can mark their alert as resolved.
CREATE OR REPLACE FUNCTION public.resolve_post_alert(p_post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE post_alerts
  SET resolved = true
  WHERE post_id = p_post_id
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE id = p_post_id AND author_user_id = auth.uid()
    );
$$;
