#!/usr/bin/env node
/**
 * Delete every object in Parul Storage buckets (avatars, post-media, etc.).
 * Requires SUPABASE_SERVICE_ROLE_KEY — never expose this in the app.
 *
 * Usage:
 *   node scripts/empty-storage.mjs
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/empty-storage.mjs
 */

import { createClient } from '@supabase/supabase-js';

const BUCKETS = [
  'avatars',
  'post-media',
  'adoption-media',
  'rescue-media',
  'circle-media',
];

const url =
  process.env.SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!url || !serviceKey) {
  console.error(
    'Missing SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.\n'
    + 'Get the service role key from Supabase Dashboard → Project Settings → API.',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Recursively collect file paths under a prefix. */
async function collectPaths(bucket, prefix = '') {
  const paths = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`${bucket}/${prefix || '(root)'}: ${error.message}`);
    if (!data?.length) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders have null id; files have an id.
      if (entry.id == null) {
        paths.push(...await collectPaths(bucket, path));
      } else {
        paths.push(path);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return paths;
}

async function removeInChunks(bucket, paths) {
  const chunkSize = 100;
  let removed = 0;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { error } = await supabase.storage.from(bucket).remove(chunk);
    if (error) throw new Error(`${bucket} remove: ${error.message}`);
    removed += chunk.length;
  }
  return removed;
}

async function emptyBucket(bucket) {
  const paths = await collectPaths(bucket);
  if (paths.length === 0) {
    console.log(`  ${bucket}: already empty`);
    return 0;
  }
  const removed = await removeInChunks(bucket, paths);
  console.log(`  ${bucket}: removed ${removed} object(s)`);
  return removed;
}

async function main() {
  console.log(`Emptying storage on ${url}\n`);
  let total = 0;
  for (const bucket of BUCKETS) {
    total += await emptyBucket(bucket);
  }
  console.log(`\nDone. ${total} object(s) deleted across ${BUCKETS.length} buckets.`);
  console.log('Note: CDN edge cache (cdn.parul.pet) may serve old URLs briefly after delete.');
}

main().catch(err => {
  console.error(err.message ?? err);
  process.exit(1);
});
