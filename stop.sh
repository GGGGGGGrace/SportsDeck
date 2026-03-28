#!/usr/bin/env bash

=set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$ROOT_DIR/sports-deck-backend"

if [ ! -d "$TARGET_DIR" ]; then
  echo "can not find directory $TARGET_DIR"
  exit 1
fi

echo "closing the system..."

cd "$TARGET_DIR"
docker compose down
# docker compose down -v # delete volumes, be careful with this command
echo "System closed successfully!"