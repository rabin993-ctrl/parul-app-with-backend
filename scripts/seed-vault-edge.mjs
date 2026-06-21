#!/usr/bin/env node
/**
 * Seed Supabase Vault with the edge-function bearer token (anon key).
 *
 * Required after db:push on a fresh Supabase project so pg_net triggers can call
 * notify / fan-out-alert edge functions.
 *
 * Usage:
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=... npm run db:seed-vault
 *   (reads from .env when vars are exported)
 */
const { spawnSync } = require('node:child_process');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');

const ROOT = resolve(__dirname, '..');

function loadDotEnv(file) {
  const path = resolve(ROOT, file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv('.env');
loadDotEnv('.env.local');

const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!anonKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY (set in .env or export before running).');
  process.exit(1);
}

const escaped = anonKey.replace(/'/g, "''");
const sql = `select public.parul_set_edge_function_token('${escaped}');`;

const result = spawnSync('npx', ['supabase', 'db', 'query', sql], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
