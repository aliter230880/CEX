#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# NexEx — Установка БЕЗ Docker (Node.js + PostgreSQL напрямую)
# Подходит для VPS с 1 ГБ RAM
# Использование: bash /root/nexex/deploy/setup-direct.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/root/nexex"
DOMAIN="hex.aliterra.space"
APP_PORT=3000
DB_NAME="nexex"
DB_USER="nexex"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}ℹ  $*${NC}"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠  $*${NC}"; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     NexEx — Прямая установка (без Docker)            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Системные пакеты ───────────────────────────────────────────────────────
info "Обновление пакетов..."
apt-get update -qq
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx

# ── 2. Node.js 22 ─────────────────────────────────────────────────────────────
if ! node --version 2>/dev/null | grep -q "v2[0-9]"; then
  info "Установка Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
success "Node.js $(node --version)"

# pnpm
if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm --silent
fi
success "pnpm $(pnpm --version)"

# pm2
if ! command -v pm2 &>/dev/null; then
  info "Установка PM2..."
  npm install -g pm2 --silent
fi
success "PM2 установлен"

# ── 3. PostgreSQL ─────────────────────────────────────────────────────────────
if ! command -v psql &>/dev/null; then
  info "Установка PostgreSQL..."
  apt-get install -y -qq postgresql postgresql-contrib
fi
systemctl enable --now postgresql
success "PostgreSQL запущен"

# Создать БД и пользователя
DB_PASS=$(grep POSTGRES_PASSWORD "$APP_DIR/deploy/.env" 2>/dev/null | cut -d= -f2 || openssl rand -base64 16 | tr -d '=+/')
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
success "БД '$DB_NAME' готова"

# ── 4. Получить/обновить код ──────────────────────────────────────────────────
if [ ! -d "$APP_DIR" ]; then
  info "Клонирование репозитория..."
  git clone https://github.com/aliter230880/CEX.git "$APP_DIR"
else
  info "Обновление кода..."
  git -C "$APP_DIR" pull --ff-only
fi

# ── 5. Настройка .env ─────────────────────────────────────────────────────────
ENV_FILE="$APP_DIR/deploy/.env"
if [ ! -f "$ENV_FILE" ]; then
  warn ".env не найден! Скопируй deploy/.env.example в deploy/.env и заполни"
  exit 1
fi

# Прочитать значения из deploy/.env
SESSION_SECRET=$(grep SESSION_SECRET "$ENV_FILE" | cut -d= -f2-)
ADMIN_PASSWORD=$(grep ADMIN_PASSWORD "$ENV_FILE" | cut -d= -f2-)
WALLET_MNEMONIC=$(grep WALLET_MNEMONIC "$ENV_FILE" | cut -d= -f2-)
HOT_WALLET_PRIVATE_KEY=$(grep HOT_WALLET_PRIVATE_KEY "$ENV_FILE" | cut -d= -f2-)

# Создать /root/nexex/.env для приложения
cat > "$APP_DIR/.env" <<ENVEOF
NODE_ENV=production
PORT=$APP_PORT
DATABASE_URL=postgres://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
SESSION_SECRET=$SESSION_SECRET
ADMIN_PASSWORD=$ADMIN_PASSWORD
WALLET_MNEMONIC=$WALLET_MNEMONIC
HOT_WALLET_PRIVATE_KEY=$HOT_WALLET_PRIVATE_KEY
FRONTEND_DIST=$APP_DIR/artifacts/cex-exchange/dist/public
ENVEOF
success ".env создан"

# ── 6. Сборка API-сервера ─────────────────────────────────────────────────────
info "Установка зависимостей и сборка API..."
cd "$APP_DIR"
pnpm install --frozen-lockfile 2>&1 | tail -3
pnpm --filter @workspace/api-server run build 2>&1 | tail -3
success "API-сервер собран"

# ── 7. Миграция БД ───────────────────────────────────────────────────────────
info "Применение миграций БД..."
DATABASE_URL="postgres://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME" \
  pnpm --filter @workspace/api-server run db:push 2>&1 | tail -5 || \
  warn "Миграция не выполнена — таблицы будут созданы при первом запуске"

# ── 8. Запуск через PM2 ───────────────────────────────────────────────────────
info "Запуск NexEx через PM2..."
cd "$APP_DIR"
pm2 delete nexex 2>/dev/null || true
set -o allexport
source "$APP_DIR/.env"
set +o allexport

pm2 start "$APP_DIR/artifacts/api-server/dist/index.mjs" \
  --name nexex \
  --node-args="--enable-source-maps"
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true
success "NexEx запущен (PM2)"

# ── 9. Nginx ──────────────────────────────────────────────────────────────────
info "Настройка nginx..."
cat > /etc/nginx/sites-available/nexex <<NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 10M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    location / {
        proxy_pass         http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/nexex /etc/nginx/sites-enabled/nexex
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
success "Nginx настроен"

# ── 10. SSL ────────────────────────────────────────────────────────────────────
echo ""
info "Получение SSL-сертификата..."
SERVER_IP=$(curl -s https://api.ipify.org)
echo ""
echo "  IP этого сервера: $SERVER_IP"
echo "  Убедись что A-запись для $DOMAIN указывает на $SERVER_IP"
echo ""
read -rp "DNS уже настроен? Получить SSL? [Y/n]: " GET_SSL
if [[ "${GET_SSL,,}" != "n" ]]; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || \
    warn "SSL не удался — сайт работает по HTTP. Повтори позже: certbot --nginx -d $DOMAIN"
fi

# ── Готово ────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║              Установка завершена!                     ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
success "NexEx запущен!"
echo ""
echo "  🌐 http://$DOMAIN (или https если SSL получен)"
echo "  🔒 Админ: http://$DOMAIN/admin"
echo ""
echo "Команды управления:"
echo "  Статус:     pm2 status"
echo "  Логи:       pm2 logs nexex"
echo "  Перезапуск: pm2 restart nexex"
