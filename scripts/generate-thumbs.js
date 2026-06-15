#!/usr/bin/env node
/**
 * generate-thumbs.js
 *
 * Finds every media_assets row that has an original file but no thumb.jpg,
 * downloads the original from Supabase Storage, resizes to 200px with sharp,
 * and uploads thumb.jpg back to the same path.
 *
 * Run once to backfill; safe to re-run (upsert).
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=<service_role_key> node scripts/generate-thumbs.js
 *
 * Install deps first (on the VPS):
 *   npm install @supabase/supabase-js sharp
 */

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const ws = require('ws');

const SUPABASE_URL = 'https://zoezppkypxogylwypdwu.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = 'avatars';

if (!SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY env var is required');
  console.error('  Get it from: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

// Extract storage path from either a CDN URL or a direct Supabase Storage URL.
// CDN:     https://cdn.parul.pet/media/avatars/{userId}/{mediaId}/original.jpg
// Storage: https://zoezppkypxogylwypdwu.supabase.co/storage/v1/object/public/avatars/{userId}/{mediaId}/original.jpg
// Returns: { bucket: 'avatars', path: '{userId}/{mediaId}/original.jpg' } or null
function parseBucketPath(url) {
  const storageMatch = url.match(/\/object\/public\/([^/]+)\/(.+)/);
  if (storageMatch) return { bucket: storageMatch[1], path: storageMatch[2] };
  const cdnMatch = url.match(/\/media\/([^/]+)\/(.+)/);
  if (cdnMatch) return { bucket: cdnMatch[1], path: cdnMatch[2] };
  return null;
}

async function run() {
  // Fetch all avatar media_assets rows
  const { data: rows, error } = await supabase
    .from('media_assets')
    .select('id, url, thumb_url')
    .or(`url.like.%/avatars/%,thumb_url.like.%/avatars/%`);

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  console.log(`Found ${rows.length} avatar media records\n`);
  let generated = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    const shortId = row.id.slice(0, 8);
    const parsed = parseBucketPath(row.url);

    if (!parsed) {
      console.log(`  ~ [${shortId}] unrecognised URL format — skip`);
      skipped++;
      continue;
    }

    const { bucket, path: originalPath } = parsed;
    const thumbPath = originalPath.replace(/\/original\.[^.]+$/, '/thumb.jpg');

    // Download original
    const { data: file, error: dlErr } = await supabase.storage
      .from(bucket)
      .download(originalPath);

    if (dlErr) {
      console.error(`  ✗ [${shortId}] download failed: ${dlErr.message}`);
      failed++;
      continue;
    }

    // Resize to 200px wide, 70% JPEG quality
    let thumbBuf;
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      thumbBuf = await sharp(buf)
        .resize({ width: 200 })
        .jpeg({ quality: 70 })
        .toBuffer();
    } catch (err) {
      console.error(`  ✗ [${shortId}] resize failed: ${err.message}`);
      failed++;
      continue;
    }

    // Upload thumb.jpg (upsert — safe to re-run)
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(thumbPath, thumbBuf, { contentType: 'image/jpeg', upsert: true });

    if (upErr) {
      console.error(`  ✗ [${shortId}] upload failed: ${upErr.message}`);
      failed++;
      continue;
    }

    console.log(`  ✓ [${shortId}] thumb.jpg generated — ${thumbBuf.length} bytes`);
    generated++;
  }

  console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${failed} failed`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
