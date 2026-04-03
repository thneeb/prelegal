#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

if ! command -v docker &>/dev/null; then
  echo "Error: Docker is not installed."
  echo "Install via: curl -fsSL https://get.docker.com | sh"
  exit 1
fi

if ! docker info &>/dev/null; then
  echo "Error: Docker daemon is not running."
  echo "Start it with: sudo systemctl start docker"
  exit 1
fi

echo "Building and starting Prelegal..."
docker compose up --build -d

echo ""
echo "Prelegal is running at http://localhost:8000"
