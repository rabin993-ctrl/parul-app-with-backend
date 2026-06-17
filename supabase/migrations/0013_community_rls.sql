-- ============================================================
-- 0013_community_rls.sql
-- Community tables: schema fixes, RLS policies, RPCs, seed data
-- ============================================================

-- ── 1. Schema fixes ─────────────────────────────────────────

-- Allow seeded rows that have no auth user as creator
ALTER TABLE communities ALTER COLUMN created_by DROP NOT NULL;

-- Denormalized member count (avoids expensive COUNT(*) on every render)
ALTER TABLE communities ADD COLUMN IF NOT EXISTS member_count integer NOT NULL DEFAULT 0;

-- Missing table used by the "save post" feature
CREATE TABLE IF NOT EXISTS community_post_saves (
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- ── 2. Sync member_count automatically ──────────────────────

CREATE OR REPLACE FUNCTION community_member_count_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_member_count ON community_members;
CREATE TRIGGER trg_community_member_count
AFTER INSERT OR DELETE ON community_members
FOR EACH ROW EXECUTE FUNCTION community_member_count_sync();

-- ── 3. SECURITY DEFINER helpers (avoid RLS infinite recursion) ──

CREATE OR REPLACE FUNCTION public.is_community_member(p_community uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_community AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_community_admin(p_community uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_community AND user_id = auth.uid() AND role = 'admin'
  );
$$;

-- ── 4. Enable RLS on new table ───────────────────────────────

ALTER TABLE community_post_saves ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS policies ─────────────────────────────────────────

-- ── communities ──
CREATE POLICY "communities_select_discoverable"
  ON communities FOR SELECT
  USING (discoverable = true OR is_community_member(id));

CREATE POLICY "communities_insert_auth"
  ON communities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "communities_update_admin"
  ON communities FOR UPDATE
  USING (is_community_admin(id))
  WITH CHECK (is_community_admin(id));

CREATE POLICY "communities_delete_admin"
  ON communities FOR DELETE
  USING (is_community_admin(id));

-- ── community_members ──
CREATE POLICY "community_members_select_member"
  ON community_members FOR SELECT
  USING (is_community_member(community_id));

CREATE POLICY "community_members_insert_self_open"
  ON community_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM communities WHERE id = community_id AND join_policy = 'open'
    )
  );

CREATE POLICY "community_members_delete_self_or_admin"
  ON community_members FOR DELETE
  USING (user_id = auth.uid() OR is_community_admin(community_id));

-- ── community_join_requests ──
CREATE POLICY "community_join_requests_select"
  ON community_join_requests FOR SELECT
  USING (user_id = auth.uid() OR is_community_admin(community_id));

CREATE POLICY "community_join_requests_insert_self"
  ON community_join_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "community_join_requests_update_admin"
  ON community_join_requests FOR UPDATE
  USING (is_community_admin(community_id))
  WITH CHECK (is_community_admin(community_id));

CREATE POLICY "community_join_requests_delete_self_or_admin"
  ON community_join_requests FOR DELETE
  USING (user_id = auth.uid() OR is_community_admin(community_id));

-- ── community_posts ──
CREATE POLICY "community_posts_select_member"
  ON community_posts FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      NOT (SELECT members_only FROM communities WHERE id = community_id)
      OR is_community_member(community_id)
    )
  );

CREATE POLICY "community_posts_insert_member"
  ON community_posts FOR INSERT
  WITH CHECK (
    author_user_id = auth.uid()
    AND is_community_member(community_id)
  );

CREATE POLICY "community_posts_update_author_or_admin"
  ON community_posts FOR UPDATE
  USING (author_user_id = auth.uid() OR is_community_admin(community_id))
  WITH CHECK (author_user_id = auth.uid() OR is_community_admin(community_id));

CREATE POLICY "community_posts_delete_author_or_admin"
  ON community_posts FOR DELETE
  USING (author_user_id = auth.uid() OR is_community_admin(community_id));

-- ── community_post_companions ──
CREATE POLICY "community_post_companions_select_member"
  ON community_post_companions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_posts p
      WHERE p.id = post_id AND p.deleted_at IS NULL
        AND (
          NOT (SELECT members_only FROM communities WHERE id = p.community_id)
          OR is_community_member(p.community_id)
        )
    )
  );

CREATE POLICY "community_post_companions_insert_post_author"
  ON community_post_companions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_posts p
      WHERE p.id = post_id AND p.author_user_id = auth.uid()
    )
  );

CREATE POLICY "community_post_companions_delete_post_author_or_admin"
  ON community_post_companions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_posts p
      WHERE p.id = post_id
        AND (p.author_user_id = auth.uid() OR is_community_admin(p.community_id))
    )
  );

-- ── community_post_helpful ──
CREATE POLICY "community_post_helpful_select_member"
  ON community_post_helpful FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_posts p
      WHERE p.id = post_id AND p.deleted_at IS NULL
        AND is_community_member(p.community_id)
    )
  );

CREATE POLICY "community_post_helpful_insert_self"
  ON community_post_helpful FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM community_posts p
      WHERE p.id = post_id AND p.deleted_at IS NULL
        AND is_community_member(p.community_id)
    )
  );

CREATE POLICY "community_post_helpful_delete_self"
  ON community_post_helpful FOR DELETE
  USING (user_id = auth.uid());

-- ── community_post_saves ──
CREATE POLICY "community_post_saves_select_self"
  ON community_post_saves FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "community_post_saves_insert_self"
  ON community_post_saves FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "community_post_saves_delete_self"
  ON community_post_saves FOR DELETE
  USING (user_id = auth.uid());

-- ── community_comments ──
CREATE POLICY "community_comments_select_member"
  ON community_comments FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM community_posts p
      WHERE p.id = post_id AND p.deleted_at IS NULL
        AND (
          NOT (SELECT members_only FROM communities WHERE id = p.community_id)
          OR is_community_member(p.community_id)
        )
    )
  );

CREATE POLICY "community_comments_insert_member"
  ON community_comments FOR INSERT
  WITH CHECK (
    author_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM community_posts p
      WHERE p.id = post_id AND p.deleted_at IS NULL
        AND is_community_member(p.community_id)
    )
  );

CREATE POLICY "community_comments_update_author"
  ON community_comments FOR UPDATE
  USING (author_user_id = auth.uid())
  WITH CHECK (author_user_id = auth.uid());

CREATE POLICY "community_comments_delete_author_or_admin"
  ON community_comments FOR DELETE
  USING (
    author_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM community_posts p
      WHERE p.id = post_id AND is_community_admin(p.community_id)
    )
  );

-- ── community_comment_helpful ──
CREATE POLICY "community_comment_helpful_select_member"
  ON community_comment_helpful FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_comments c
      JOIN community_posts p ON p.id = c.post_id
      WHERE c.id = comment_id AND c.deleted_at IS NULL
        AND is_community_member(p.community_id)
    )
  );

CREATE POLICY "community_comment_helpful_insert_self"
  ON community_comment_helpful FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM community_comments c
      JOIN community_posts p ON p.id = c.post_id
      WHERE c.id = comment_id AND c.deleted_at IS NULL
        AND is_community_member(p.community_id)
    )
  );

CREATE POLICY "community_comment_helpful_delete_self"
  ON community_comment_helpful FOR DELETE
  USING (user_id = auth.uid());

-- ── 6. RPCs ─────────────────────────────────────────────────

-- Join an open community
CREATE OR REPLACE FUNCTION public.join_community(p_community uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM communities WHERE id = p_community AND join_policy = 'open') THEN
    RAISE EXCEPTION 'community_not_open';
  END IF;
  INSERT INTO community_members (community_id, user_id, role)
  VALUES (p_community, auth.uid(), 'member')
  ON CONFLICT (community_id, user_id) DO NOTHING;
END;
$$;

-- Leave a community
CREATE OR REPLACE FUNCTION public.leave_community(p_community uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM community_members
  WHERE community_id = p_community AND user_id = auth.uid();
END;
$$;

-- Send a join request (request-only communities)
CREATE OR REPLACE FUNCTION public.send_community_request(p_community uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM communities WHERE id = p_community AND join_policy = 'request') THEN
    RAISE EXCEPTION 'community_not_request_policy';
  END IF;
  INSERT INTO community_join_requests (community_id, user_id, state)
  VALUES (p_community, auth.uid(), 'pending')
  ON CONFLICT (community_id, user_id) DO NOTHING;
END;
$$;

-- Accept a join request (admin only)
CREATE OR REPLACE FUNCTION public.accept_community_request(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_community uuid;
  v_user uuid;
BEGIN
  SELECT community_id, user_id INTO v_community, v_user
  FROM community_join_requests WHERE id = p_request_id AND state = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF NOT is_community_admin(v_community) THEN RAISE EXCEPTION 'not_admin'; END IF;

  UPDATE community_join_requests SET state = 'approved' WHERE id = p_request_id;
  INSERT INTO community_members (community_id, user_id, role)
  VALUES (v_community, v_user, 'member')
  ON CONFLICT (community_id, user_id) DO NOTHING;
END;
$$;

-- Decline a join request (admin only)
CREATE OR REPLACE FUNCTION public.decline_community_request(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_community uuid;
BEGIN
  SELECT community_id INTO v_community
  FROM community_join_requests WHERE id = p_request_id AND state = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF NOT is_community_admin(v_community) THEN RAISE EXCEPTION 'not_admin'; END IF;

  UPDATE community_join_requests SET state = 'rejected' WHERE id = p_request_id;
END;
$$;

-- Create a community (creator becomes admin member)
CREATE OR REPLACE FUNCTION public.create_community(
  p_name text,
  p_about text,
  p_icon text,
  p_tint text,
  p_join_policy join_policy_enum DEFAULT 'open',
  p_default_category community_category_enum DEFAULT 'general',
  p_guidelines text DEFAULT NULL,
  p_members_only boolean DEFAULT false,
  p_discoverable boolean DEFAULT true
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO communities (
    name, about, icon, tint, created_by,
    join_policy, default_category, guidelines,
    members_only, discoverable
  ) VALUES (
    p_name, p_about, p_icon, p_tint, auth.uid(),
    p_join_policy, p_default_category, p_guidelines,
    p_members_only, p_discoverable
  ) RETURNING id INTO v_id;

  INSERT INTO community_members (community_id, user_id, role)
  VALUES (v_id, auth.uid(), 'admin');

  RETURN v_id;
END;
$$;

-- Update community settings (admin only)
CREATE OR REPLACE FUNCTION public.update_community_settings(
  p_community uuid,
  p_name text DEFAULT NULL,
  p_about text DEFAULT NULL,
  p_icon text DEFAULT NULL,
  p_tint text DEFAULT NULL,
  p_join_policy join_policy_enum DEFAULT NULL,
  p_default_category community_category_enum DEFAULT NULL,
  p_guidelines text DEFAULT NULL,
  p_members_only boolean DEFAULT NULL,
  p_discoverable boolean DEFAULT NULL,
  p_allow_links boolean DEFAULT NULL,
  p_post_approval boolean DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_community_admin(p_community) THEN RAISE EXCEPTION 'not_admin'; END IF;

  UPDATE communities SET
    name             = COALESCE(p_name, name),
    about            = COALESCE(p_about, about),
    icon             = COALESCE(p_icon, icon),
    tint             = COALESCE(p_tint, tint),
    join_policy      = COALESCE(p_join_policy, join_policy),
    default_category = COALESCE(p_default_category, default_category),
    guidelines       = COALESCE(p_guidelines, guidelines),
    members_only     = COALESCE(p_members_only, members_only),
    discoverable     = COALESCE(p_discoverable, discoverable),
    allow_links      = COALESCE(p_allow_links, allow_links),
    post_approval    = COALESCE(p_post_approval, post_approval),
    updated_at       = now()
  WHERE id = p_community;
END;
$$;

-- Remove a member (admin only)
CREATE OR REPLACE FUNCTION public.remove_community_member(p_community uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_community_admin(p_community) THEN RAISE EXCEPTION 'not_admin'; END IF;
  IF p_user = auth.uid() THEN RAISE EXCEPTION 'cannot_remove_self'; END IF;

  DELETE FROM community_members
  WHERE community_id = p_community AND user_id = p_user;
END;
$$;

-- ── 7. Seed communities ──────────────────────────────────────
-- Demo communities are intentionally NOT seeded here so that a --no-seed reset
-- yields a truly empty database. The demo set (with real creators + members)
-- lives in supabase/seed.sql and loads only on a seeded reset (npm run clean-slate:seed).

-- ── 8. Realtime publications ────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE communities;
ALTER PUBLICATION supabase_realtime ADD TABLE community_members;
ALTER PUBLICATION supabase_realtime ADD TABLE community_join_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE community_post_helpful;
ALTER PUBLICATION supabase_realtime ADD TABLE community_post_saves;
ALTER PUBLICATION supabase_realtime ADD TABLE community_comments;
