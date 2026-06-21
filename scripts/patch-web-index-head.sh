#!/usr/bin/env bash
# Inject favicon / PWA link tags into dist/index.html after expo export.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INDEX="$ROOT/dist/index.html"
SNIPPET="$ROOT/assets/html-snippet.txt"

if [[ ! -f "$INDEX" ]]; then
  echo "patch-web-index-head: missing $INDEX (run expo export first)" >&2
  exit 1
fi

python3 - "$INDEX" "$SNIPPET" << 'PY'
import sys
from pathlib import Path

index_path = Path(sys.argv[1])
snippet_path = Path(sys.argv[2])
html = index_path.read_text()
snippet = snippet_path.read_text().strip()

marker = "</title>"
if marker not in html:
    raise SystemExit("patch-web-index-head: </title> not found in index.html")

if snippet.splitlines()[0] in html:
    print("patch-web-index-head: head tags already present, skipping")
    sys.exit(0)

html = html.replace(marker, marker + "\n    " + snippet.replace("\n", "\n    "), 1)
index_path.write_text(html)
print("patch-web-index-head: injected favicon links into index.html")
PY
