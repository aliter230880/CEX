#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# NexEx — Автоматическая установка на Ubuntu VPS
# Использование: curl -fsSL https://raw.githubusercontent.com/aliter230880/CEX/main/deploy/setup-vps.sh | bash
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO="https://github.com/aliter230880/CEX.git"
APP_DIR="$HOME/nexex"
DOMAIN="hex.aliterra.space"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}ℹ  $*${NC}"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠  $*${NC}"; }
err()     { echo -e "${RED}❌ $*${NC}"; exit 1; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        NexEx Exchange — Установка на VPS             ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Зависимости ────────────────────────────────────────────────────────────
info "Обновление пакетов..."
apt-get update -qq

if ! command -v docker &>/dev/null; then
  info "Установка Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  success "Docker установлен"
else
  success "Docker уже установлен: $(docker --version)"
fi

if ! docker compose version &>/dev/null 2>&1; then
  info "Установка Docker Compose..."
  apt-get install -y -qq docker-compose-plugin
fi

if ! command -v git &>/dev/null; then
  apt-get install -y -qq git
fi

if ! command -v certbot &>/dev/null; then
  info "Установка Certbot..."
  apt-get install -y -qq certbot
fi

# ── 2. Клонирование репозитория ───────────────────────────────────────────────
if [ -d "$APP_DIR" ]; then
  info "Обновление репозитория..."
  git -C "$APP_DIR" pull --ff-only
else
  info "Клонирование репозитория..."
  git clone "$REPO" "$APP_DIR"
fi
cd "$APP_DIR/deploy"

# ── 3. Настройка .env ─────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  info "Создание файла .env..."
  cp .env.example .env

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Настройка конфигурации"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # SESSION_SECRET
  SESSION_SECRET=$(openssl rand -hex 32)
  sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=${SESSION_SECRET}|" .env
  success "SESSION_SECRET сгенерирован автоматически"

  # POSTGRES_PASSWORD
  PG_PASS=$(openssl rand -base64 20 | tr -d '=+/')
  sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PG_PASS}|" .env
  # Update DATABASE_URL too
  sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgres://nexex:${PG_PASS}@postgres:5432/nexex|" .env
  success "Пароль PostgreSQL сгенерирован автоматически"

  echo ""
  echo "Введите данные для администратора:"
  echo ""

  # ADMIN_PASSWORD
  read -rsp "  Пароль администратора (/admin): " ADMIN_PASS
  echo ""
  ADMIN_HASH=$(docker run --rm node:22-alpine node -e "
    const bcrypt = require('bcryptjs');
    bcrypt.hash(process.argv[1], 12).then(h => process.stdout.write(h));
  " "$ADMIN_PASS" 2>/dev/null || \
  node -e "const bcrypt=require('bcryptjs');bcrypt.hash('$ADMIN_PASS',12).then(h=>process.stdout.write(h));" 2>/dev/null || \
  echo "NEED_MANUAL")

  if [ "$ADMIN_HASH" = "NEED_MANUAL" ]; then
    warn "Не удалось сгенерировать bcrypt-хеш автоматически."
    warn "После установки выполни: cd $APP_DIR && node deploy/scripts/gen-admin-hash.js 'ТвойПароль'"
    warn "Затем вставь результат в deploy/.env как ADMIN_PASSWORD=..."
  else
    sed -i "s|ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_HASH}|" .env
    success "ADMIN_PASSWORD настроен"
  fi

  echo ""
  warn "⚠  Следующие параметры НУЖНО заполнить вручную в файле deploy/.env:"
  warn "   WALLET_MNEMONIC   — 12 слов для HD-кошелька"
  warn "   HOT_WALLET_PRIVATE_KEY — приватный ключ горячего кошелька"
  echo ""
  read -rp "Открыть редактор для заполнения .env сейчас? [Y/n]: " EDIT_NOW
  if [[ "${EDIT_NOW,,}" != "n" ]]; then
    ${EDITOR:-nano} .env
  fi
else
  success ".env уже существует, пропускаем"
fi

# ── 4. SSL-сертификат ─────────────────────────────────────────────────────────
SSL_DIR="./nginx/ssl"
mkdir -p "$SSL_DIR"

if [ ! -f "$SSL_DIR/fullchain.pem" ]; then
  echo ""
  info "Получение SSL-сертификата Let's Encrypt для $DOMAIN..."
  warn "Убедись, что DNS-запись A для $DOMAIN уже указывает на IP этого сервера!"
  echo ""
  read -rp "IP этого сервера (Enter — узнать автоматически): " SERVER_IP
  if [ -z "$SERVER_IP" ]; then
    SERVER_IP=$(curl -s https://api.ipify.org)
    info "Определён IP: $SERVER_IP"
  fi

  echo ""
  echo "Добавь A-запись в DNS:"
  echo "  Имя: hex.aliterra.space"
  echo "  Тип: A"
  echo "  Значение: $SERVER_IP"
  echo ""
  read -rp "DNS уже настроен? Продолжить получение сертификата? [Y/n]: " DNS_READY

  if [[ "${DNS_READY,,}" != "n" ]]; then
    # Free port 80 if something is running
    if ss -tlnp | grep -q ':80 '; then
      warn "Порт 80 занят, временно останавливаем контейнеры..."
      docker compose down 2>/dev/null || true
    fi

    certbot certonly --standalone \
      --non-interactive \
      --agree-tos \
      --email "admin@${DOMAIN}" \
      -d "$DOMAIN" || {
        warn "Certbot не удался. Создаём самоподписанный сертификат для теста..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
          -keyout "$SSL_DIR/privkey.pem" \
          -out "$SSL_DIR/fullchain.pem" \
          -subj "/CN=${DOMAIN}"
        warn "⚠  Самоподписанный сертификат создан. Браузер покажет предупреждение."
        warn "   Позже выполни: certbot certonly --standalone -d $DOMAIN"
      }

    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
      cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "$SSL_DIR/fullchain.pem"
      cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "$SSL_DIR/privkey.pem"
      success "SSL-сертификат получен!"

      # Auto-renewal cron
      (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem $APP_DIR/deploy/nginx/ssl/fullchain.pem && cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem $APP_DIR/deploy/nginx/ssl/privkey.pem && docker compose -f $APP_DIR/deploy/docker-compose.yml restart nginx") | crontab -
      success "Автообновление сертификата настроено (cron)"
    fi
  else
    info "Создаём временный самоподписанный сертификат..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout "$SSL_DIR/privkey.pem" \
      -out "$SSL_DIR/fullchain.pem" \
      -subj "/CN=${DOMAIN}"
    warn "⚠  Замени на реальный сертификат командой:"
    warn "   certbot certonly --standalone -d $DOMAIN"
    warn "   Затем скопируй файлы в $SSL_DIR/"
  fi
fi

# ── 5. Сборка и запуск ────────────────────────────────────────────────────────
echo ""
info "Сборка и запуск NexEx..."
cd "$APP_DIR"
docker compose -f deploy/docker-compose.yml build --no-cache
docker compose -f deploy/docker-compose.yml up -d

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║                  Установка завершена!                ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
success "NexEx запущен!"
echo ""
echo "  🌐 Сайт:        https://$DOMAIN"
echo "  🔒 Админ-панель: https://$DOMAIN/admin"
echo ""
echo "Полезные команды:"
echo "  Логи:      docker compose -f $APP_DIR/deploy/docker-compose.yml logs -f app"
echo "  Остановить: docker compose -f $APP_DIR/deploy/docker-compose.yml down"
echo "  Перезапуск: docker compose -f $APP_DIR/deploy/docker-compose.yml restart"
echo ""
