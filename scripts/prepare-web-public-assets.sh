#!/usr/bin/env bash
# Copy static web assets into public/ so Expo export serves them at fixed URLs
# (e.g. https://parul.pet/email/logo.png for Supabase email templates).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/public/email"

cp "$ROOT/assets/logo.png" "$ROOT/public/email/logo.png"

# Favicons + PWA manifest at site root (served before SPA fallback on Vercel).
for f in \
  favicon.ico \
  favicon.svg \
  favicon-16x16.png \
  favicon-32x32.png \
  favicon-96x96.png \
  apple-touch-icon.png \
  site.webmanifest \
  web-app-manifest-192x192.png \
  web-app-manifest-512x512.png
do
  cp "$ROOT/assets/$f" "$ROOT/public/$f"
done
