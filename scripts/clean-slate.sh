#!/usr/bin/env bash
# Wipe all Parul backend data while keeping the schema (migrations re-applied).
# Targets the LINKED Supabase project by default.
#
# Prerequisites:
#   - supabase CLI logged in (supabase login)
#   - project linked (npm run supabase:link)
#   - SUPABASE_SERVICE_ROLE_KEY in .env or .env.local (for storage wipe)
#
# Usage:
#   npm run clean-slate              # remote, empty (no seed.sql)
#   npm run clean-slate -- --seed    # remote + reload demo seed data
#   npm run clean-slate -- --local   # local Supabase only
#   npm run clean-slate -- --db-only # skip storage wipe
#   npm run clean-slate -- --storage-only
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

load_env() {
  set -a
  [[ -f .env ]] && source .env
  [[ -f .env.local ]] && source .env.local
  set +a
}

TARGET="linked"
SEED="no"
DB="yes"
STORAGE="yes"

for arg in "$@"; do
  case "$arg" in
    --local) TARGET="local" ;;
    --seed) SEED="yes" ;;
    --db-only) STORAGE="no" ;;
    --storage-only) DB="no" ;;
    --help|-h)
      sed -n '2,15p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown flag: $arg (try --help)" >&2
      exit 1
      ;;
  esac
done

load_env

echo "============================================================"
echo "  PARUL CLEAN SLATE"
echo "============================================================"
echo "  Target:     ${TARGET} Supabase project"
echo "  Database:   ${DB} (schema preserved, all rows + auth users removed)"
echo "  Storage:    ${STORAGE} (all bucket objects deleted)"
echo "  Seed data:  ${SEED} (demo users from supabase/seed.sql)"
echo ""
echo "  WARNING: This is irreversible."
echo "============================================================"
echo ""
read -r -p "Type clean-slate to continue: " CONFIRM
if [[ "$CONFIRM" != "clean-slate" ]]; then
  echo "Aborted."
  exit 1
fi

if [[ "$DB" == "yes" ]]; then
  echo ""
  echo "==> Resetting database (re-apply migrations)…"
  RESET_ARGS=(db reset)
  if [[ "$TARGET" == "linked" ]]; then
    RESET_ARGS+=(--linked)
  else
    RESET_ARGS+=(--local)
  fi
  if [[ "$SEED" == "no" ]]; then
    RESET_ARGS+=(--no-seed)
  fi
  RESET_ARGS+=(--yes)
  npx supabase "${RESET_ARGS[@]}"
  echo "    Database reset complete."
fi

if [[ "$STORAGE" == "yes" ]]; then
  echo ""
  echo "==> Emptying Storage buckets…"
  node scripts/empty-storage.mjs
fi

echo ""
echo "==> Clean slate complete."
echo ""
echo "Next steps:"
echo "  1. Sign out of the app / clear browser site data for your app URL"
echo "  2. Register fresh accounts in the app"
if [[ "$SEED" == "yes" ]]; then
  echo "  3. Demo logins: see supabase/seed.sql (password: password123)"
fi
