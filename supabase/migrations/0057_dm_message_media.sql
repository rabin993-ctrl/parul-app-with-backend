-- DM chat: photo/file attachments via message_media rows.
-- Renumbered from 0054 (0054_circle_invites already applied on remote).

ALTER TYPE message_kind_enum ADD VALUE IF NOT EXISTS 'media';

DROP POLICY IF EXISTS "message_media_insert" ON message_media;

CREATE POLICY "message_media_insert" ON message_media
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN thread_participants tp ON tp.thread_id = m.thread_id
      WHERE m.id = message_media.message_id
        AND m.sender_user_id = auth.uid()
        AND tp.user_id = auth.uid()
    )
  );
