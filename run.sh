#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/sports-deck-backend"

if [ ! -d "$BACKEND_DIR" ]; then
  echo "[run] Error: sports-deck-backend directory not found at $BACKEND_DIR"
  exit 1
fi

echo "[run] Starting backend dev server"
cd "$BACKEND_DIR"
npm run dev
