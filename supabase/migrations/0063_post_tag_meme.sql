-- Allow meme as a feed post tag (matches composer label).
ALTER TYPE post_tag_enum ADD VALUE IF NOT EXISTS 'meme';
