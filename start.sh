#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TARGET_DIR="$ROOT_DIR/sports-deck-backend"

if [ ! -d "$TARGET_DIR" ]; then
  echo "can not find directory $TARGET_DIR"
  exit 1
fi

echo "starting the system..."

cd "$TARGET_DIR"
docker compose up -d --build

echo "System started successfully! The website is running in the background."