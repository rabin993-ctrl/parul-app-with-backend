#!/usr/bin/env bash
# Reset LINKED remote Supabase and reload demo seed data (5 test users + sample content).
set -euo pipefail
exec "$(dirname "$0")/clean-slate.sh" --seed "$@"
