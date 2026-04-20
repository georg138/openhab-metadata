#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SRC_QUADLET="${REPO_DIR}/deploy/openhab-metadata.container"

if [[ ! -f "${SRC_QUADLET}" ]]; then
  echo "Quadlet source not found: ${SRC_QUADLET}" >&2
  exit 1
fi

MODE="system"
if [[ "${1:-}" == "--user" ]]; then
  MODE="user"
  shift
fi

if [[ $# -gt 0 ]]; then
  echo "Usage: $0 [--user]"
  exit 1
fi

if ! command -v podman >/dev/null 2>&1; then
  echo "podman is required but not found in PATH" >&2
  exit 1
fi

if [[ "${MODE}" == "user" ]]; then
  UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/containers/systemd"
  SYSTEMCTL=(systemctl --user)
  WANTED_BY="default.target"
else
  UNIT_DIR="/etc/containers/systemd"
  SYSTEMCTL=(systemctl)
  WANTED_BY="multi-user.target"

  if [[ "${EUID}" -ne 0 ]]; then
    echo "System install requires root. Re-run with sudo or use --user." >&2
    exit 1
  fi
fi

mkdir -p "${UNIT_DIR}"
install -m 0644 "${SRC_QUADLET}" "${UNIT_DIR}/openhab-metadata.container"

# Create env file with empty token if it doesn't exist yet
ENV_FILE="${UNIT_DIR}/openhab-metadata.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  install -m 0600 /dev/null "${ENV_FILE}"
  echo "OPENHAB_TOKEN=" >> "${ENV_FILE}"
fi

"${SYSTEMCTL[@]}" daemon-reload
"${SYSTEMCTL[@]}" enable --now openhab-metadata.service

echo "Installed Quadlet to ${UNIT_DIR}/openhab-metadata.container"
echo "Enabled service: openhab-metadata.service (${MODE} mode, wanted by ${WANTED_BY})"

if [[ "${MODE}" == "user" ]]; then
  echo "Tip: for user services to stay active after logout, run: loginctl enable-linger \"$USER\""
fi
