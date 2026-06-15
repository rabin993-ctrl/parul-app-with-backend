-- Add shared_post support to the messages table so forwarded posts
-- can be stored as structured references (not just plain text).

ALTER TYPE message_kind_enum ADD VALUE IF NOT EXISTS 'shared_post';

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES posts(id) ON DELETE SET NULL;
