# NexEx — Контекст проекта

> Последнее обновление: апрель 2026 · CI/CD тест  
> Репозиторий: https://github.com/aliter230880/CEX  
> Продакшн: https://hex.aliterra.space

---

## 1. Что такое NexEx

**NexEx** — централизованная криптовалютная биржа (CEX) с реальной блокейн-инфраструктурой.  
Поддерживает спотовую торговлю, HD-кошельки для депозитов, on-chain вывод средств, книгу ордеров с матчинг-движком и панель администратора.

### Торговые пары
- BTC/USDT
- ETH/USDT
- BNB/USDT
- POL/USDT
- SOL/USDT

### Поддерживаемые сети
- **ETH** — Ethereum (ERC-20)
- **BSC** — BNB Smart Chain (BEP-20)
- **POLYGON** — Polygon (POL)

### Комиссия
- 0.1% от суммы каждой сделки

### Стартовые балансы новых пользователей (тестовые)
- 10 000 USDT
- 0.5 BTC
- 5 ETH
- 10 BNB
- 1 000 POL

---

## 2. Архитектура

### Монорепозиторий (pnpm workspaces)

```
/
├── artifacts/
│   ├── api-server/          # Express API (Node.js 22)
│   └── cex-exchange/        # React + Vite фронтенд
├── lib/
│   ├── db/                  # Drizzle ORM, схема БД, миграции
│   └── api-zod/             # Zod-схемы для валидации API
├── deploy/                  # Скрипты деплоя
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── setup-vps.sh         # Интерактивный установщик (с Docker)
│   ├── setup-direct.sh      # Установщик без Docker (для 1 ГБ RAM)
│   ├── nginx/nginx.conf     # nginx с SSL и rate limiting
│   └── postgres/            # SQL init-скрипты
└── CONTEXT.md               # Этот файл
```

### Стек технологий

| Слой | Технология |
|------|-----------|
| Фронтенд | React 18, Vite, TypeScript, TailwindCSS, Recharts |
| API | Express 5, TypeScript, pino (логи) |
| БД | PostgreSQL 16, Drizzle ORM |
| Сессии | express-session (cookie-based) |
| Пароли | bcryptjs (rounds: 12) |
| Блокейн | ethers.js v6 (HD wallet, on-chain транзакции) |
| Процесс | PM2 (продакшн) / ts-node (разработка) |
| Веб-сервер | nginx (reverse proxy, SSL termination) |
| SSL | Let's Encrypt via certbot (авторенев через cron) |
| Пакеты | pnpm workspaces (монорепо) |

### Схема базы данных

```
users             — аккаунты пользователей
balances          — балансы по каждому активу и сети
trading_pairs     — торговые пары (BTC/USDT и т.д.)
orders            — книга ордеров
trades            — история исполненных сделок
klines            — OHLCV свечи для графика
deposit_addresses — адреса депозитов (HD-кошелёк)
withdrawals       — заявки на вывод
audit_log         — лог действий администратора
```

### Матчинг-движок

Файл: `artifacts/api-server/src/lib/matching-engine.ts`

- Лимитные и маркет-ордера
- Приоритет по цене, затем по времени (FIFO)
- При исполнении: атомарное обновление балансов + создание записи сделки
- Замороженные пользователи исключены через SQL `INNER JOIN` с проверкой `account_status`
- Комиссия 0.1% списывается с покупателя в quote-asset

### HD-кошелёк (депозиты)

- Используется `ethers.js` HDNodeWallet
- Каждому пользователю деривируется уникальный адрес: `m/44'/60'/0'/0/{userId}`
- Приватный ключ не хранится в БД — деривируется из мнемоники при каждом запросе
- WALLET_MNEMONIC — 12-словная фраза, хранится только в `.env`

### Горячий кошелёк (выводы)

- HOT_WALLET_PRIVATE_KEY — ключ кошелька для отправки on-chain транзакций
- Кошелёк должен иметь запас нативного газа (ETH/BNB/MATIC) для оплаты gas fees

---

## 3. Что реализовано

### Пользователи
- [x] Регистрация / вход / выход
- [x] Сессии через httpOnly cookie (secure в продакшн)
- [x] Хеширование паролей bcrypt (rounds: 12)
- [x] Стартовые балансы при регистрации

### Торговля
- [x] Книга ордеров (лимитные и маркет ордера)
- [x] Матчинг-движок (реальное исполнение)
- [x] История сделок
- [x] OHLCV свечи / тиккеры
- [x] 24h статистика рынка (объём, изменение, хай/лоу)

### Кошелёк
- [x] Просмотр балансов
- [x] Генерация адресов депозита (HD-кошелёк)
- [x] Запрос на вывод средств
- [ ] Мониторинг блокейна (входящие депозиты) — в разработке
- [ ] Автоматическое исполнение выводов — в разработке

### Панель администратора `/admin`
- [x] Аутентификация через bcrypt-хеш пароля
- [x] Список пользователей с поиском и пагинацией (server-side SQL)
- [x] Заморозка / разморозка аккаунтов (с авто-отменой ордеров и возвратом locked-балансов)
- [x] Ручная корректировка балансов пользователя
- [x] Список ордеров
- [x] Audit log с пагинацией (все административные действия)
- [x] Обязательная причина (reason) для freeze/unfreeze/sweep/escrow-key
- [x] Sweep эскроу-кошелька

---

## 4. Продакшн-инфраструктура

### Сервер

| Параметр | Значение |
|---------|---------|
| Провайдер | рег.облако (reg.ru) |
| Имя | Coral Ununennium (ID: 4519085) |
| IP | 89.111.152.187 |
| ОС | Ubuntu 24.04 LTS |
| CPU | 1 vCPU |
| RAM | 1 ГБ |
| Диск | 10 ГБ |
| Тариф | Std C1-M1-D10, 0.58 ₽/час |
| Расположение | Санкт-Петербург |

### Домен
- `hex.aliterra.space` → A-запись → `89.111.152.187`
- DNS управляется через ISPmanager на shared хостинге reg.ru

### Запуск на сервере

```bash
# Приложение управляется через PM2
pm2 status              # статус
pm2 logs nexex          # логи в реальном времени
pm2 restart nexex       # перезапуск
pm2 delete nexex        # остановить

# Конфиг PM2 (важно: env-переменные загружаются из ecosystem.config.cjs)
cat /root/nexex/ecosystem.config.cjs

# nginx
systemctl status nginx
systemctl reload nginx      # применить изменения конфига
cat /etc/nginx/sites-available/nexex

# SSL (авторенев через certbot cron)
certbot certificates        # статус сертификатов
```

### Файлы на сервере

```
/root/nexex/               # корень проекта (git clone)
/root/nexex/.env           # переменные окружения (НЕ в git)
/root/nexex/ecosystem.config.cjs  # PM2 конфиг с env
/etc/nginx/sites-available/nexex  # nginx конфиг
/etc/letsencrypt/live/hex.aliterra.space/  # SSL сертификат
~/.pm2/logs/               # логи PM2
```

---

## 5. Конфигурация и секреты

> ⚠️ Никогда не коммить `.env` в репозиторий!

### Переменные окружения (`.env` на сервере)

| Переменная | Описание |
|-----------|---------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` (nginx проксирует 80/443 → 3000) |
| `DATABASE_URL` | `postgres://nexex:PASSWORD@localhost:5432/nexex` |
| `SESSION_SECRET` | Случайная 64-символьная строка (hex) |
| `ADMIN_PASSWORD` | Bcrypt-хеш пароля администратора |
| `WALLET_MNEMONIC` | 12 слов HD-кошелька (пробелами) |
| `HOT_WALLET_PRIVATE_KEY` | Приватный ключ 0x... горячего кошелька |
| `FRONTEND_DIST` | `/root/nexex/artifacts/cex-exchange/dist/public` |
| `POSTGRES_PASSWORD` | Пароль пользователя БД nexex |

### Где хранятся секреты в Replit

В Replit Secrets (иконка 🔒 в боковой панели):
- `WALLET_MNEMONIC`
- `HOT_WALLET_PRIVATE_KEY`
- `SESSION_SECRET`

### Генерация bcrypt-хеша для ADMIN_PASSWORD

```bash
# На сервере:
cd /root/nexex
npm install --prefix /tmp bcryptjs
node -e "const b=require('/tmp/node_modules/bcryptjs');b.hash('ТвойПароль',12).then(console.log)"
```

---

## 6. Обновление приложения на сервере

```bash
cd /root/nexex

# 1. Получить обновления
git pull

# 2. Пересобрать API-сервер (если изменялся код)
pnpm --filter @workspace/api-server run build

# 3. Применить миграции БД (если изменялась схема)
export $(grep -v '^#' .env | xargs -d '\n')
pnpm --filter @workspace/db run push

# 4. Перезапустить
pm2 restart nexex

# 5. Если изменился .env — пересоздать ecosystem.config.cjs
node -e "
const fs = require('fs');
const env = {};
fs.readFileSync('.env','utf8').split('\n').forEach(l => {
  const m = l.match(/^([^#=]+)=(.*)/);
  if(m) env[m[1].trim()] = m[2].trim();
});
fs.writeFileSync('ecosystem.config.cjs', 'module.exports={apps:[{name:\"nexex\",script:\"artifacts/api-server/dist/index.mjs\",node_args:\"--enable-source-maps\",env:' + JSON.stringify(env) + '}]}');
"
pm2 delete nexex && pm2 start ecosystem.config.cjs && pm2 save
```

---

## 7. Первоначальная инициализация БД

При первом деплое на чистый сервер:

```bash
cd /root/nexex
export $(grep -v '^#' .env | xargs -d '\n')

# Создать таблицы
pnpm --filter @workspace/db run push

# Заполнить торговые пары
psql $DATABASE_URL << 'SQL'
INSERT INTO trading_pairs (symbol, base_asset, quote_asset, status, min_order_size, tick_size, step_size, network) VALUES
  ('BTC/USDT', 'BTC', 'USDT', 'active', 0.00001, 0.01, 0.00001, 'ETH'),
  ('ETH/USDT', 'ETH', 'USDT', 'active', 0.0001,  0.01, 0.0001,  'ETH'),
  ('BNB/USDT', 'BNB', 'USDT', 'active', 0.001,   0.01, 0.001,   'BSC'),
  ('POL/USDT', 'POL', 'USDT', 'active', 0.01,    0.0001,0.01,   'POLYGON'),
  ('SOL/USDT', 'SOL', 'USDT', 'active', 0.001,   0.01, 0.001,   'ETH')
ON CONFLICT (symbol) DO NOTHING;
SQL
```

---

## 8. Трудности и решения

### 8.1 Express 5 — синтаксис wildcard-роута

**Проблема:** `app.get("*", handler)` выбрасывал `PathError` с path-to-regexp v8 (используется в Express 5).

**Решение:** Изменить на `app.get("/{*path}", handler)`.

**Файл:** `artifacts/api-server/src/app.ts`

---

### 8.2 Docker build — нехватка RAM на 1 ГБ

**Проблема:** Multi-stage Docker build (frontend + API) требует ~1.5–2 ГБ RAM. На VPS с 1 ГБ зависал на шаге `pnpm install` для фронтенда (2476 модулей).

**Решение:**
1. Предсобранный фронтенд добавлен в git (исключение в `.gitignore`)
2. Dockerfile упрощён — убрана стадия `frontend-builder`
3. Деплой переведён с Docker на прямой запуск Node.js + PM2

**Файлы:** `deploy/Dockerfile`, `.gitignore`, `artifacts/cex-exchange/dist/` (в git)

---

### 8.3 PM2 — опция `--env-file` не поддерживается

**Проблема:** Старая версия PM2 не поддерживает `--env-file` флаг.

**Решение:** Создание `ecosystem.config.cjs` с env-переменными, сгенерированными из `.env`:

```bash
node -e "
const fs = require('fs');
const env = {};
fs.readFileSync('.env','utf8').split('\n').forEach(l => {
  const m = l.match(/^([^#=]+)=(.*)/);
  if(m) env[m[1].trim()] = m[2].trim();
});
fs.writeFileSync('ecosystem.config.cjs',
  'module.exports={apps:[{name:\"nexex\",script:\"artifacts/api-server/dist/index.mjs\",node_args:\"--enable-source-maps\",env:' + JSON.stringify(env) + '}]}');
"
```

---

### 8.4 Сессионные куки не работают за nginx

**Проблема:** После настройки nginx reverse proxy логин перестал работать. Cookie с флагом `secure: true` не устанавливался, потому что Express видел HTTP-соединение (nginx → app на порту 3000), не зная о HTTPS снаружи.

**Решение:** Добавить `app.set("trust proxy", 1)` перед session middleware.

**Файл:** `artifacts/api-server/src/app.ts` (строка 15)

---

### 8.5 Таблицы БД не созданы после деплоя

**Проблема:** После запуска приложения все API-запросы возвращали 500 — таблицы не существовали в PostgreSQL.

**Решение:** Вручную применить Drizzle-миграции:
```bash
export $(grep -v '^#' .env | xargs -d '\n')
pnpm --filter @workspace/db run push
```
Затем вставить начальные данные (торговые пары) через SQL.

---

### 8.6 WALLET_MNEMONIC с пробелами — проблема экспорта

**Проблема:** `export $(grep -v '^#' .env | xargs -d '\n')` некорректно обрабатывает многословные значения с пробелами (мнемоника = 12 слов через пробел). При `pm2 restart --update-env` переменная не передавалась.

**Решение:** Генерировать `ecosystem.config.cjs` с env как JSON-объект — PM2 загружает переменные напрямую без shell-парсинга.

---

### 8.7 Порт 80 занят при старте Docker

**Проблема:** Системный nginx занимал порт 80, Docker не мог запустить nginx-контейнер.

**Решение:**
```bash
systemctl stop nginx && systemctl disable nginx
```

---

### 8.8 curl | bash — интерактивный ввод не работает

**Проблема:** Запуск `curl ... | bash` перенаправляет stdin с curl, а не с терминала, поэтому команды `read` (запрос пароля) не работают.

**Решение:** Разделить на два этапа — сначала клонировать репозиторий, затем запускать скрипт напрямую: `bash /root/nexex/deploy/setup-direct.sh`.

---

### 8.9 Рабочая среда Replit — чёрный экран

**Проблема:** Интерфейс Replit перестал отображаться (чёрный экран в левой панели).

**Решение:** Открыть проект в другом браузере или жёсткое обновление `Ctrl+Shift+R`. Весь код и чат сохраняются автоматически в чекпоинтах.

---

## 9. Что планируется (TODO)

### Высокий приоритет
- [ ] **Мониторинг блокейна** — сканирование новых блоков и зачисление депозитов автоматически
- [ ] **Исполнение выводов** — отправка on-chain транзакций через горячий кошелёк
- [ ] **Верификация email** — подтверждение при регистрации
- [ ] **2FA** — Google Authenticator / TOTP

### Средний приоритет
- [ ] **WebSocket** — real-time обновления книги ордеров и сделок
- [ ] **KYC** — верификация личности
- [ ] **Реферальная система**
- [ ] **Маржинальная торговля**

### Низкий приоритет
- [ ] **Мобильное приложение** (Expo/React Native)
- [ ] **API для трейдеров** (REST + WebSocket, API-ключи)
- [ ] **Поддержка большего числа сетей** (Arbitrum, Optimism, Base)

---

## 10. Структура ключевых файлов

```
artifacts/api-server/src/
├── app.ts                   # Express app (trust proxy, session, middlewares)
├── routes/
│   ├── index.ts             # Роутер
│   ├── auth.ts              # Регистрация / вход / выход
│   ├── market.ts            # Рыночные данные (тиккеры, свечи, книга)
│   ├── orders.ts            # Создание и отмена ордеров
│   ├── wallet.ts            # Балансы, депозит, вывод
│   └── admin.ts             # Панель администратора
└── lib/
    ├── matching-engine.ts   # Матчинг-движок
    ├── wallet.ts            # HD-кошелёк (ethers.js)
    └── logger.ts            # pino логгер

artifacts/cex-exchange/src/
├── pages/
│   ├── markets.tsx          # Обзор рынков
│   ├── trade.tsx            # Торговый терминал
│   ├── wallet.tsx           # Кошелёк
│   ├── orders.tsx           # История ордеров
│   └── admin/               # Панель администратора
├── components/              # UI-компоненты
└── lib/api.ts               # API-клиент

lib/db/src/
├── schema/                  # Drizzle-схемы таблиц
├── index.ts                 # Подключение к БД
└── drizzle.config.ts        # Конфиг Drizzle Kit
```

---

## 11. Полезные команды для разработки (Replit)

```bash
# Запуск в dev-режиме (все сервисы)
# Используй кнопку Run в Replit (workflows)

# Применить изменения схемы БД
pnpm --filter @workspace/db run push

# Пересобрать фронтенд для деплоя
cd artifacts/cex-exchange && BASE_PATH=/ NODE_ENV=production pnpm run build

# Пересобрать API
pnpm --filter @workspace/api-server run build

# Push в GitHub
git add . && git commit -m "..." && git push
```
