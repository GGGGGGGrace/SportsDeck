#!/bin/bash

echo "Starting data import process..."

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TARGET_DIR="$ROOT_DIR/sports-deck-backend"

if [ ! -d "$TARGET_DIR" ]; then
  echo "can not find directory $TARGET_DIR"
  exit 1
fi

cd "$TARGET_DIR"
docker-compose up -d db redis

docker-compose --profile setup run --rm db-setup

echo "Data import completed!"