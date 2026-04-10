#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env.local if present
if [[ -f "$REPO_ROOT/.env.local" ]]; then
  set -a; source "$REPO_ROOT/.env.local"; set +a
fi

if [[ -z "${OPENHAB_URL:-}" ]]; then
  echo "Error: OPENHAB_URL is not set."
  echo "  Set it in the environment or create a .env.local file:"
  echo "    OPENHAB_URL=https://your-openhab-host"
  echo "    OPENHAB_TOKEN=oh.your.token"
  exit 1
fi

cd "$REPO_ROOT"
exec npm start
