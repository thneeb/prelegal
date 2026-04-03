#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

if ! command -v docker &>/dev/null; then
  echo "Error: Docker is not installed. Install Docker Desktop from https://www.docker.com/products/docker-desktop/"
  exit 1
fi

if ! docker info &>/dev/null; then
  echo "Error: Docker daemon is not running. Start Docker Desktop and try again."
  exit 1
fi

echo "Building and starting Prelegal..."
docker compose up --build -d

echo ""
echo "Prelegal is running at http://localhost:8000"
