-- Fix existing avatar media_assets rows where thumb_url points to a thumb.jpg
-- that was never uploaded (thumbnail generation was disabled in the app).
-- Set thumb_url = url (the original CDN URL, which does exist) so the feed FK
-- join returns a working URL immediately. The VPS cron (generate-thumbs.js)
-- will upload the real thumb.jpg files and the CDN will start serving them.
UPDATE media_assets
SET thumb_url = url
WHERE url LIKE '%/avatars/%'
  AND thumb_url LIKE '%/thumb.jpg';
