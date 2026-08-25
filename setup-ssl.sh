#!/bin/bash
# ==============================================
# SSL Setup Script using Let's Encrypt (Certbot)
# Usage: ./setup-ssl.sh yourdomain.com
# ==============================================

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
  echo "Usage: ./setup-ssl.sh yourdomain.com"
  exit 1
fi

echo "=== Setting up SSL for $DOMAIN ==="

# 1. Update nginx.conf with actual domain
sed -i "s/yourdomain.com/$DOMAIN/g" nginx/nginx.conf

# 2. Restart nginx to apply domain
docker compose -f docker-compose.prod.yml restart nginx

# 3. Get SSL certificate
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  --email admin@$DOMAIN \
  --agree-tos --no-eff-email \
  -d $DOMAIN

# 4. Enable HTTPS in nginx.conf
# Uncomment the HTTPS server block and HTTP redirect
sed -i 's/^    # server {/    server {/' nginx/nginx.conf
sed -i 's/^    #     listen 443/        listen 443/' nginx/nginx.conf
sed -i 's/^    #     /        /g' nginx/nginx.conf
sed -i 's/^    # }/    }/' nginx/nginx.conf

echo ""
echo "Updating nginx config with HTTPS..."
echo "NOTE: You may need to manually uncomment the HTTPS block in nginx/nginx.conf"
echo "      and comment out the HTTP server block (keep only the redirect)."
echo ""

# 5. Restart
docker compose -f docker-compose.prod.yml restart nginx

echo "=== SSL setup complete! ==="
echo "Your app should now be accessible at: https://$DOMAIN"
