#!/usr/bin/env node
/**
 * generate-thumbs.js
 *
 * Finds media_assets rows whose thumb.jpg is missing in Storage, downloads the
 * original, resizes to 200px with sharp, and uploads thumb.jpg back.
 *
 * Run on the VPS (cron every 15 min + webhook trigger). Safe to re-run (upsert).
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=<service_role_key> node scripts/generate-thumbs.js
 *   SUPABASE_SERVICE_KEY=... node scripts/generate-thumbs.js --bucket post-media
 *
 * Install deps on the VPS:
 *   npm install @supabase/supabase-js sharp ws
 */

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const ws = require('ws');

const SUPABASE_URL = process.env.SUPABASE_URL
  ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DEFAULT_BUCKETS = ['avatars', 'post-media'];

const bucketArg = process.argv.find(a => a.startsWith('--bucket='))?.split('=')[1];
const BUCKETS = bucketArg ? [bucketArg] : DEFAULT_BUCKETS;

if (!SUPABASE_URL) {
  console.error('Error: SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL env var is required');
  process.exit(1);
}

if (!SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY env var is required');
  console.error('  Get it from: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

// CDN:     https://cdn.parul.pet/media/avatars/{userId}/{mediaId}/original.jpg
// Legacy:  https://cdn.parul.pet/avatars/{userId}/{mediaId}/original.jpg
// Storage: https://…supabase.co/storage/v1/object/public/avatars/…
function parseBucketPath(url) {
  const storageMatch = url.match(/\/object\/public\/([^/]+)\/(.+)/);
  if (storageMatch) return { bucket: storageMatch[1], path: storageMatch[2] };
  const cdnMatch = url.match(/\/media\/([^/]+)\/(.+)/);
  if (cdnMatch) return { bucket: cdnMatch[1], path: cdnMatch[2] };
  const legacyCdnMatch = url.match(/cdn\.parul\.pet\/([^/]+)\/(.+)/);
  if (legacyCdnMatch && legacyCdnMatch[1] !== 'media') {
    return { bucket: legacyCdnMatch[1], path: legacyCdnMatch[2] };
  }
  return null;
}

async function processBucket(bucket) {
  const { data: rows, error } = await supabase
    .from('media_assets')
    .select('id, url, thumb_url, mime')
    .or(`url.like.%/${bucket}/%,thumb_url.like.%/${bucket}/%`);

  if (error) {
    console.error(`Query failed for ${bucket}:`, error.message);
    return { generated: 0, skipped: 0, failed: 0 };
  }

  console.log(`\n==> ${bucket}: ${rows.length} media records`);
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const shortId = row.id.slice(0, 8);
    if (row.mime && !String(row.mime).startsWith('image/')) {
      skipped++;
      continue;
    }

    const parsed = parseBucketPath(row.url);
    if (!parsed || parsed.bucket !== bucket) {
      console.log(`  ~ [${shortId}] unrecognised URL format — skip`);
      skipped++;
      continue;
    }

    const { path: originalPath } = parsed;
    const thumbPath = originalPath.replace(/\/original\.[^.]+$/, '/thumb.jpg');
    if (thumbPath === originalPath) {
      skipped++;
      continue;
    }

    const { data: existingThumb } = await supabase.storage.from(bucket).download(thumbPath);
    if (existingThumb) {
      skipped++;
      continue;
    }

    const { data: file, error: dlErr } = await supabase.storage
      .from(bucket)
      .download(originalPath);

    if (dlErr) {
      console.error(`  ✗ [${shortId}] download failed: ${dlErr.message}`);
      failed++;
      continue;
    }

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

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(thumbPath, thumbBuf, { contentType: 'image/jpeg', upsert: true });

    if (upErr) {
      console.error(`  ✗ [${shortId}] upload failed: ${upErr.message}`);
      failed++;
      continue;
    }

    console.log(`  ✓ [${shortId}] thumb.jpg — ${thumbBuf.length} bytes`);
    generated++;
  }

  return { generated, skipped, failed };
}

async function run() {
  let totals = { generated: 0, skipped: 0, failed: 0 };
  for (const bucket of BUCKETS) {
    const result = await processBucket(bucket);
    totals.generated += result.generated;
    totals.skipped += result.skipped;
    totals.failed += result.failed;
  }
  console.log(`\nDone: ${totals.generated} generated, ${totals.skipped} skipped, ${totals.failed} failed`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
