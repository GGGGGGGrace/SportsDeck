#!/usr/bin/env bash

'''
GenAI citation: Claude Opus 4.5
Prompt: Please write a startup script that will be 
used in development. It should 1) install dependencies for both 
the root and backend directories, 2) run Prisma generate,
migrate, and seed commands, 3) check for the presence of a
MATCH_API_KEY environment variable and if present, run a script to sync football data, and 4) delegate to the existing run.sh script
to start the development server. The script should be idempotent and handle errors gracefully.
'''
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/sports-deck-backend"

if [ ! -d "$BACKEND_DIR" ]; then
  echo "[startup] Error: sports-deck-backend directory not found at $BACKEND_DIR"
  exit 1
fi

install_deps() {
  local target_dir="$1"
  if [ -f "$target_dir/package-lock.json" ]; then
    echo "[startup] Installing dependencies in $target_dir with npm ci"
    (cd "$target_dir" && npm ci)
  else
    echo "[startup] Installing dependencies in $target_dir with npm install"
    (cd "$target_dir" && npm install)
  fi
}

echo "[startup] Starting environment bootstrap"

if [ -f "$ROOT_DIR/package.json" ]; then
  install_deps "$ROOT_DIR"
fi

install_deps "$BACKEND_DIR"

echo "[startup] Running Prisma generate"
(cd "$BACKEND_DIR" && npx prisma generate)

echo "[startup] Running Prisma migrations"
(cd "$BACKEND_DIR" && npx prisma migrate deploy)

echo "[startup] Running Prisma seed"
(cd "$BACKEND_DIR" && npx prisma db seed)

if [ -f "$BACKEND_DIR/.env" ]; then
  set +u
  source "$BACKEND_DIR/.env"
  set -u
fi

if [ -n "${MATCH_API_KEY:-}" ]; then
  echo "[startup] MATCH_API_KEY detected, syncing competition and team data"
  (cd "$BACKEND_DIR" && npx tsx prisma/syncFootballData.ts)
else
  echo "[startup] MATCH_API_KEY not set, skipping football data sync"
fi

echo "[startup] Setup completed"
echo "[startup] Delegating server startup to run.sh"
"$ROOT_DIR/run.sh"
