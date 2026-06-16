#!/usr/bin/env bash
# Reset LOCAL Supabase only (Docker). Schema kept, data wiped, no seed.
set -euo pipefail
exec "$(dirname "$0")/clean-slate.sh" --local "$@"
