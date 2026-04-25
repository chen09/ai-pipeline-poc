#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEED_DIR="$ROOT_DIR/fixtures/seed_tasks"
INBOX_DIR="$ROOT_DIR/agent/inbox"
FORCE=0

if [[ "${1:-}" == "--force" ]]; then
  FORCE=1
fi

if [[ ! -d "$SEED_DIR" ]]; then
  echo "Seed directory not found: $SEED_DIR" >&2
  exit 1
fi

mkdir -p "$INBOX_DIR"

shopt -s nullglob
existing=("$INBOX_DIR"/*.md)
seed_files=("$SEED_DIR"/*.md)
shopt -u nullglob

if [[ ${#seed_files[@]} -eq 0 ]]; then
  echo "No seed task files found in $SEED_DIR" >&2
  exit 1
fi

if [[ ${#existing[@]} -gt 0 && $FORCE -ne 1 ]]; then
  echo "Inbox is not empty: $INBOX_DIR" >&2
  echo "Use --force to replace existing inbox task files." >&2
  exit 1
fi

if [[ $FORCE -eq 1 && ${#existing[@]} -gt 0 ]]; then
  rm -f "$INBOX_DIR"/*.md
fi

for file in "${seed_files[@]}"; do
  cp "$file" "$INBOX_DIR/"
done

python "$ROOT_DIR/scripts/validate_tasks.py" "$SEED_DIR"/*.md

echo "Loaded ${#seed_files[@]} seed task(s) from fixtures into agent/inbox."
echo "Note: if n8n workflows are active, files may be claimed from inbox immediately."
