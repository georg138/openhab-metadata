#!/usr/bin/env bash
set -euo pipefail

# Detect container runtime (prefer podman, fall back to docker)
if command -v podman &>/dev/null; then
  RUNTIME=podman
elif command -v docker &>/dev/null; then
  RUNTIME=docker
else
  echo "Error: neither podman nor docker found in PATH" >&2
  exit 1
fi

IMAGE_NAME="openhab-metadata"
CONTAINER_NAME="openhab-metadata"
PORT="${PORT:-5180}"

# Read env vars – can be set in environment or a local .env file
if [[ -f "$(dirname "$0")/../.env.local" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$(dirname "$0")/../.env.local"; set +a
fi

OPENHAB_URL="${OPENHAB_URL:-}"
OPENHAB_TOKEN="${OPENHAB_TOKEN:-}"

if [[ -z "$OPENHAB_URL" ]]; then
  echo "Error: OPENHAB_URL is not set."
  echo "  Set it in the environment or create a .env.local file:"
  echo "    OPENHAB_URL=https://your-openhab-host"
  echo "    OPENHAB_TOKEN=oh.your.token"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Runtime : $RUNTIME"
echo "==> Building image '$IMAGE_NAME' from $REPO_ROOT ..."
"$RUNTIME" build -f "$REPO_ROOT/Containerfile" -t "$IMAGE_NAME" "$REPO_ROOT"

# Stop + remove any existing container with the same name
if "$RUNTIME" inspect "$CONTAINER_NAME" &>/dev/null; then
  echo "==> Removing existing container '$CONTAINER_NAME' ..."
  "$RUNTIME" rm -f "$CONTAINER_NAME"
fi

echo "==> Starting container on http://localhost:$PORT ..."
"$RUNTIME" run \
  --name "$CONTAINER_NAME" \
  --rm \
  -p "${PORT}:5180" \
  -e "OPENHAB_URL=$OPENHAB_URL" \
  -e "OPENHAB_TOKEN=$OPENHAB_TOKEN" \
  "$IMAGE_NAME"
