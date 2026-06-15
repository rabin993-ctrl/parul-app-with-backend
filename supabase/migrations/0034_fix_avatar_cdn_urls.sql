-- Avatar media_assets rows stored broken CDN URLs because generateVariants=false
-- was passed (no thumbnail generated) but the CDN path for thumb.jpg was still
-- written to the DB. The CDN (cdn.parul.pet) is not reliably serving these files.
-- Fix: replace CDN prefix with Supabase Storage URL for all avatar records,
-- and set thumb_url = url (original file) since no thumbnail was ever uploaded.
UPDATE media_assets
SET
  url = replace(url,
    'https://cdn.parul.pet/media/',
    'https://zoezppkypxogylwypdwu.supabase.co/storage/v1/object/public/'),
  thumb_url = replace(url,
    'https://cdn.parul.pet/media/',
    'https://zoezppkypxogylwypdwu.supabase.co/storage/v1/object/public/')
WHERE url LIKE 'https://cdn.parul.pet/media/avatars/%';
