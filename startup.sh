#!/usr/bin/env bash


# GenAI citation: Claude Opus 4.5
# Prompt: Please write a startup script that will be 
# used in development. It should 1) install dependencies for both 
# the root and backend directories, 2) run Prisma generate,
# migrate, and seed commands, 3) check for the presence of a
# MATCH_API_KEY environment variable and if present, run a script to sync football data, and 4) delegate to the existing run.sh script
# to start the development server. The script should be idempotent and handle errors gracefully.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/sports-deck-backend"

if [ ! -d "$BACKEND_DIR" ]; then
  echo "[startup] Error: sports-deck-backend directory not found"
  exit 1
fi

DB_CONTAINER_NAME="sportsdeck-db"
DB_PORT="5432"

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

echo "[startup] Bootstrapping environment..."

echo "[startup] Checking Postgres container..."

if docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}\$"; then
  echo "[startup] Container exists"

  if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}\$"; then
    echo "[startup] Starting existing container..."
    docker start "$DB_CONTAINER_NAME"
  else
    echo "[startup] Container already running"
  fi
else
  echo "[startup] Creating new Postgres container..."
  docker run --name "$DB_CONTAINER_NAME" \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=sportsdeck \
    -p ${DB_PORT}:5432 \
    -d postgres
fi

echo "[startup] Waiting for Postgres to be ready..."

until docker exec "$DB_CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done

echo "[startup] Postgres is ready"

ENV_FILE="$BACKEND_DIR/.env"

echo "[startup] Ensuring DATABASE_URL is correct"

sed -i '/^DATABASE_URL=/d' "$ENV_FILE" 2>/dev/null || true

echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sportsdeck"' >> "$ENV_FILE"

if [ -f "$ROOT_DIR/package.json" ]; then
  install_deps "$ROOT_DIR"
fi

install_deps "$BACKEND_DIR"

echo "[startup] Checking Prisma Postgres adapter"

if ! (cd "$BACKEND_DIR" && npm list @prisma/adapter-pg >/dev/null 2>&1); then
  echo "[startup] Installing Prisma Postgres adapter"
  (cd "$BACKEND_DIR" && npm install @prisma/adapter-pg pg)
fi

echo "[startup] Running Prisma generate"
(cd "$BACKEND_DIR" && npx prisma generate)

echo "[startup] Running Prisma migrations"
(cd "$BACKEND_DIR" && npx prisma migrate dev --name init || true)

echo "[startup] Running Prisma seed"
(cd "$BACKEND_DIR" && npx prisma db seed || true)

if [ -f "$ENV_FILE" ]; then
  set +u
  source "$ENV_FILE"
  set -u
fi

if [ -n "${MATCH_API_KEY:-}" ]; then
  echo "[startup] MATCH_API_KEY detected, syncing data"
  (cd "$BACKEND_DIR" && npx tsx prisma/syncFootballData.ts)
else
  echo "[startup] No MATCH_API_KEY, skipping sync"
fi

echo "[startup] Setup complete"
echo "[startup] Starting server..."

"$ROOT_DIR/run.sh"