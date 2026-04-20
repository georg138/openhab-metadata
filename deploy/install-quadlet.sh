#!/bin/bash
set -euo pipefail

QUADLET_DIR="/etc/containers/systemd"
QUADLET_FILE="openhab-metadata.container"
SRC="$(dirname "$0")/$QUADLET_FILE"
DEST="$QUADLET_DIR/$QUADLET_FILE"

# Preserve OPENHAB_TOKEN from installed quadlet if it exists
TOKEN=""
if [[ -f "$DEST" ]]; then
    TOKEN=$(grep -Po '(?<=Environment=OPENHAB_TOKEN=).+' "$DEST" || true)
fi

install -m 644 "$SRC" "$DEST"

if [[ -n "$TOKEN" ]]; then
    sed -i "s/^Environment=OPENHAB_TOKEN=.*/Environment=OPENHAB_TOKEN=$TOKEN/" "$DEST"
fi

systemctl daemon-reload
systemctl enable --now openhab-metadata.service
