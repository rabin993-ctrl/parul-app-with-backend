#!/usr/bin/env bash
# Local convenience: build Expo web and deploy to Vercel production.
# Requires: npx vercel linked to the project (run `npx vercel link` once).
# In CI/CD, .github/workflows/deploy-web.yml handles this automatically on push to main.
set -euo pipefail

echo "==> Preparing public web assets…"
bash scripts/prepare-web-public-assets.sh

echo "==> Building web bundle (expo export)…"
# Requires EXPO_PUBLIC_* in .env or the shell environment (see .env.example).
npx expo export --platform web   # outputs ./dist

echo "==> Deploying to Vercel (production)…"
npx vercel --prod

echo "==> Done. Check https://vercel.com/dashboard for the live URL."
