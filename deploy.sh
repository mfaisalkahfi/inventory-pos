#!/bin/bash
set -e
echo "=== Inventory & POS Deployment ==="

if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy from .env.production:"
  echo "  cp .env.production .env && nano .env"
  exit 1
fi

echo "Stopping existing containers..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "Waiting for services to be ready..."
sleep 15

echo ""
echo "Container status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "=== Deployment complete! ==="
echo ""
echo "To seed database (first time):"
echo "  docker exec -it invpos_be sh -c 'node dist/database/seeds/run-seed.js'"
echo ""
echo "App: http://inv-pos.mfaisalkahfi.my.id"
