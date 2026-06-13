#!/usr/bin/env bash
# Build the Expo web bundle and deploy it to the droplet (served by Caddy).
# Configure these once (or pass as env):  DROPLET_HOST, DROPLET_USER, REMOTE_DIR
# Usage:  DROPLET_HOST=1.2.3.4 npm run deploy:web
set -euo pipefail

DROPLET_USER="${DROPLET_USER:-root}"
DROPLET_HOST="${DROPLET_HOST:?set DROPLET_HOST=<droplet ip or host>}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/parul}"

echo "==> Building web bundle (expo export)…"
npx expo export -p web   # outputs ./dist

echo "==> Syncing dist/ to ${DROPLET_USER}@${DROPLET_HOST}:${REMOTE_DIR}…"
rsync -az --delete dist/ "${DROPLET_USER}@${DROPLET_HOST}:${REMOTE_DIR}/"

echo "==> Reloading Caddy…"
ssh "${DROPLET_USER}@${DROPLET_HOST}" 'systemctl reload caddy'

echo "==> Done. Live at your configured domain."
