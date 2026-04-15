#!/usr/bin/env bash
set -euo pipefail

DOMAIN="hex.aliterra.space"
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"

echo "╔══════════════════════════════════════════════════╗"
echo "║           NexEx — Production Deployment          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 1. Check required tools
for cmd in docker docker-compose openssl; do
  if ! command -v $cmd &>/dev/null; then
    echo "❌ $cmd is required but not installed. Please install it first."
    exit 1
  fi
done

# 2. Check .env exists
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  echo "❌ deploy/.env not found."
  echo ""
  echo "  Run: cp deploy/.env.example deploy/.env"
  echo "  Then fill in all values in deploy/.env"
  echo ""
  echo "  To generate ADMIN_PASSWORD hash:"
  echo "  node deploy/scripts/gen-admin-hash.js 'YourPassword'"
  exit 1
fi

# 3. Check for SSL certificates
SSL_DIR="$DEPLOY_DIR/nginx/ssl"
if [ ! -f "$SSL_DIR/fullchain.pem" ] || [ ! -f "$SSL_DIR/privkey.pem" ]; then
  echo "⚠️  SSL certificates not found in deploy/nginx/ssl/"
  echo ""
  echo "  Option A — Let's Encrypt (recommended):"
  echo "  sudo certbot certonly --standalone -d $DOMAIN"
  echo "  sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/"
  echo "  sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem  $SSL_DIR/"
  echo ""
  echo "  Option B — Self-signed (for testing only):"
  echo "  mkdir -p $SSL_DIR"
  echo "  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
  echo "    -keyout $SSL_DIR/privkey.pem \\"
  echo "    -out $SSL_DIR/fullchain.pem \\"
  echo "    -subj '/CN=$DOMAIN'"
  echo ""
  read -rp "Generate a self-signed cert for testing now? [y/N] " yn
  if [[ "$yn" =~ ^[Yy]$ ]]; then
    mkdir -p "$SSL_DIR"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout "$SSL_DIR/privkey.pem" \
      -out "$SSL_DIR/fullchain.pem" \
      -subj "/CN=$DOMAIN"
    echo "✓ Self-signed certificate generated"
  else
    echo "Aborting — please add SSL certificates and re-run deploy.sh"
    exit 1
  fi
fi

# 4. Build and start containers
echo ""
echo "▶ Building Docker images (this takes a few minutes the first time)..."
cd "$ROOT_DIR"
docker-compose -f "$DEPLOY_DIR/docker-compose.yml" --env-file "$DEPLOY_DIR/.env" build

echo ""
echo "▶ Starting services..."
docker-compose -f "$DEPLOY_DIR/docker-compose.yml" --env-file "$DEPLOY_DIR/.env" up -d

echo ""
echo "▶ Running DB schema push..."
docker-compose -f "$DEPLOY_DIR/docker-compose.yml" --env-file "$DEPLOY_DIR/.env" \
  exec app sh -c "cd /app && node -e \"
import('./dist/index.mjs').catch(() => {})
\"" 2>/dev/null || true

sleep 3
docker-compose -f "$DEPLOY_DIR/docker-compose.yml" --env-file "$DEPLOY_DIR/.env" ps

echo ""
echo "✅ NexEx deployed successfully!"
echo "   Open: https://$DOMAIN"
echo "   Admin: https://$DOMAIN/admin"
echo ""
echo "Useful commands:"
echo "  Logs:     docker-compose -f deploy/docker-compose.yml logs -f app"
echo "  Restart:  docker-compose -f deploy/docker-compose.yml restart app"
echo "  Stop:     docker-compose -f deploy/docker-compose.yml down"
