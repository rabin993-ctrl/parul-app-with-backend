#!/usr/bin/env bash
# Copy static web assets into public/ so Expo export serves them at fixed URLs
# (e.g. https://parul.pet/email/logo.png for Supabase email templates).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/public/email"
cp "$ROOT/assets/logo.png" "$ROOT/public/email/logo.png"
