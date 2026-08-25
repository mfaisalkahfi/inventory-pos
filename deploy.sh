#!/bin/bash
# ==============================================
# Deployment Script for Inventory & POS System
# Run this on your VPS after cloning the repo
# ==============================================

set -e

echo "=== Inventory & POS Deployment ==="

# 1. Check .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env file not found!"
  echo "Copy .env.production to .env and fill in your values:"
  echo "  cp .env.production .env"
  echo "  nano .env"
  exit 1
fi

# 2. Source env
export $(grep -v '^#' .env | xargs)

# 3. Build and start containers
echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

# 4. Wait for DB to be ready
echo "Waiting for database..."
sleep 10

# 5. Run seed (first time only)
echo "Running database seed..."
docker compose -f docker-compose.prod.yml exec backend node -e "
const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres', host: 'postgres', port: 5432,
  username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, synchronize: true,
  entities: ['dist/**/*.entity.js'],
});
ds.initialize().then(async () => {
  console.log('Database schema synchronized');
  await ds.destroy();
}).catch(err => { console.error(err); process.exit(1); });
"

echo ""
echo "=== Deployment complete! ==="
echo ""
echo "Your app is running at: http://your-server-ip"
echo ""
echo "Next steps:"
echo "1. Point your domain DNS A record to this server IP"
echo "2. Run SSL setup: ./setup-ssl.sh yourdomain.com"
echo "3. Seed the database: docker compose -f docker-compose.prod.yml exec backend npm run seed"
echo ""
