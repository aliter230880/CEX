# ATEX Exchange — Полный контекст проекта

> Обновлено: 16 апреля 2026  
> Статус: **В активной разработке** — продакшн работает на https://hex.aliterra.space  
> Репозиторий: https://github.com/aliter230880/CEX

---

## 1. Что такое проект

**ATEX** — полноценная централизованная криптобиржа (CEX) с:
- Спотовой торговлей (биржевой стакан, матчинг-движок)
- Реальными HD-кошельками на базе мнемоники (BIP39/BIP44)
- Мониторингом депозитов on-chain (ETH, BSC, Polygon)
- Ордербуком и историей сделок в реальном времени
- Графиком цен (TradingView-совместимый, данные через CoinGecko)
- Полноценной панелью управления для администратора

**Продакшн URL:** https://hex.aliterra.space  
**VPS:** 89.111.152.187 (Ubuntu 24.04), путь `/root/nexex`

---

## 2. Архитектура системы

### 2.1 Monorepo (pnpm workspaces)

```
/workspace
├── artifacts/
│   ├── api-server/          # Express.js API (TypeScript, сборка через esbuild)
│   └── cex-exchange/        # React + Vite фронтенд (dist коммитится в git)
├── lib/
│   └── db/                  # Drizzle ORM + PostgreSQL схемы и миграции
└── .github/workflows/
    └── deploy.yml           # CI/CD: push → одобрение → деплой на VPS по SSH
```

### 2.2 API Server (`artifacts/api-server`)

**Стек:** Node.js + Express + TypeScript, собирается esbuild → `dist/index.mjs`

**Роуты:**
| Маршрут | Файл | Описание |
|---------|------|----------|
| `GET /api/health` | health.ts | Проверка доступности |
| `POST /api/auth/login` | auth.ts | Вход пользователя |
| `POST /api/auth/register` | auth.ts | Регистрация |
| `GET /api/auth/me` | auth.ts | Текущий пользователь |
| `GET /api/market/pairs` | market.ts | Список торговых пар |
| `GET /api/market/ticker/:pair` | market.ts | Цена и 24h изменение |
| `GET /api/market/klines/:pair` | market.ts | OHLCV свечи |
| `GET /api/market/stream` | market.ts | SSE real-time поток цен |
| `GET /api/orderbook/:pair` | orderbook.ts | Стакан (bid/ask) |
| `GET /api/market/recent-trades/:pair` | market.ts | Последние сделки |
| `GET/POST /api/orders` | orders.ts | Создание и список ордеров |
| `DELETE /api/orders/:id` | orders.ts | Отмена ордера |
| `GET /api/trades` | trades.ts | История сделок пользователя |
| `GET /api/balances` | balances.ts | Балансы пользователя |
| `GET /api/wallet/deposit-address` | wallet.ts | Адреса для депозита |
| `POST /api/wallet/withdraw` | wallet.ts | Запрос на вывод |
| `POST /api/admin/login` | admin.ts | Вход администратора |
| `GET /api/admin/me` | admin.ts | Статус сессии администратора |
| `GET /api/admin/users` | admin.ts | Список пользователей |
| `GET /api/admin/users/:id` | admin.ts | Детали пользователя |
| `PATCH /api/admin/users/:id` | admin.ts | Блокировка/разблокировка |
| `GET /api/admin/trading-pairs` | admin.ts | Управление парами |
| `POST /api/admin/trading-pairs` | admin.ts | Добавить пару |
| `PATCH /api/admin/trading-pairs/:id` | admin.ts | Вкл/выкл пару |
| `GET /api/admin/tokens` | admin.ts | Листинг кастомных токенов |
| `POST /api/admin/tokens` | admin.ts | Добавить токен |
| `DELETE /api/admin/tokens/:id` | admin.ts | Делистинг токена |
| `GET/PUT /api/admin/fees/:asset` | admin.ts | Комиссии по активу |
| `GET/PUT /api/admin/referrals` | admin.ts | Реферальная программа |
| `GET /api/admin/transactions` | admin.ts | Все депозиты/выводы |
| `GET /api/admin/audit-log` | admin.ts | Журнал действий |

**Ключевые библиотеки:**
- `express-session` — сессии (хранятся в памяти процесса)
- `bcryptjs` — хэширование паролей
- `ethers.js v6` — работа с блокчейном
- `drizzle-orm` + `pg` — ORM для PostgreSQL
- `pino` + `pino-http` — структурированное логирование

**Особенности:** При старте загружает `.env` через встроенный Node.js `fs` (без внешних пакетов). Значения из `.env` всегда перезаписывают env vars PM2 — это критично для обновления `ADMIN_PASSWORD`.

### 2.3 Frontend (`artifacts/cex-exchange`)

**Стек:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + wouter (роутинг)

**Страницы:**
```
/              → Landing — лендинг с живыми ценами
/markets       → Список всех торговых пар
/trade/:pair   → Торговый терминал (график + стакан + форма)
/login         → Вход пользователя
/register      → Регистрация
/wallet        → Кошелёк (депозит / вывод)
/orders        → Мои ордера

/admin/login       → Вход в панель администратора
/admin             → Дашборд (7 секций)
/admin/users       → Список пользователей с поиском
/admin/users/:id   → Профиль пользователя
/admin/trading-pairs → Управление торговыми парами
/admin/tokens      → Листинг ERC-20/BEP-20 токенов
/admin/fees        → Комиссии (maker/taker/вывод) по активам
/admin/referrals   → Реферальная программа
/admin/transactions → Мониторинг транзакций (авто-обновление 15с)
/admin/audit-log   → Журнал действий администратора
```

**Ресайзируемые панели (localStorage):**
- Боковое меню торговых пар: 160–400px (`use-sidebar-width.ts`)
- Ордербук / форма ордера: `use-resizable-panels.ts`
- Компонент разделителя: `ResizableDivider.tsx`

**Важно:** `dist/` коммитится в git и деплоится как статические файлы — API раздаёт их из `dist/public`. После изменений UI **обязательна пересборка**:
```bash
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/cex-exchange run build
git add artifacts/cex-exchange/dist/
```

### 2.4 База данных (PostgreSQL + Drizzle ORM)

**Схемы** (`lib/db/src/schema/`):
| Таблица | Описание |
|---------|----------|
| `users` | Пользователи (email, password hash, createdAt) |
| `balances` | Балансы по активам (userId, asset, amount) |
| `orders` | Ордера (type, side, price, qty, status) |
| `trades` | Исполненные сделки |
| `klines` | OHLCV свечи (пара, интервал, timestamp) |
| `trading_pairs` | Торговые пары (symbol, base, quote, active) |
| `crypto_transactions` | Депозиты и выводы (type, amount, txHash, status) |
| `deposit_addresses` | HD-адреса пользователей (userId, chain, address, index) |
| `admin_audit_log` | Лог действий администратора |
| `fee_config` | Комиссии по активам (maker, taker, withdrawal) |
| `referral_config` | Настройки реферальной программы |
| `custom_tokens` | ERC-20/BEP-20 токены через admin |

**Миграции:** `drizzle-kit push` (schema-first, без файлов миграций)

### 2.5 Блокчейн-интеграция

**Поддерживаемые сети:**
- Ethereum (ETH) — mainnet
- BNB Smart Chain (BSC) — mainnet
- Polygon (POL/MATIC) — mainnet

**HD Wallet (BIP44):**
- Мнемоника из `WALLET_MNEMONIC`
- Деривация: `m/44'/60'/0'/0/{userIndex}`
- Один EVM-адрес на пользователя для всех трёх сетей

**Мониторинг депозитов:**
- Опрос `eth_getLogs` (Transfer events) на каждой сети
- Поддержка нативных монет (ETH/BNB/POL) и ERC-20/BEP-20 (USDT, USDC и др.)
- После подтверждения — автоматическое зачисление баланса

**Горячий кошелёк:** `HOT_WALLET_PRIVATE_KEY` — для выводов пользователям

### 2.6 CI/CD Pipeline

```
git push → GitHub Actions:
  1. Список изменений (автоматически)
  2. Ожидание ручного одобрения (environment: production)
  3. SSH на VPS (appleboy/ssh-action):
     a. git fetch + reset --hard origin/main
     b. Запись bcrypt-хэша ADMIN_PASSWORD в .env (через sed)
     c. Безопасное извлечение DATABASE_URL (grep + cut, без source)
     d. drizzle-kit push (миграции схемы)
     e. esbuild (сборка API → dist/index.mjs)
     f. Копирование logo.png если есть
     g. pm2 restart nexex
```

**PM2:** использует `ecosystem.config.cjs` — критично для `WALLET_MNEMONIC` с пробелами  
**Nginx:** reverse proxy, `app.set("trust proxy", 1)` обязателен для сессионных cookie

---

## 3. Переменные окружения

### VPS (`/root/nexex/.env`)

| Переменная | Описание |
|-----------|----------|
| `PORT` | Порт API сервера (8080 на проде) |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Секрет express-session |
| `WALLET_MNEMONIC` | BIP39 мнемоника (12–24 слова через пробелы!) |
| `HOT_WALLET_PRIVATE_KEY` | Private key горячего кошелька |
| `ADMIN_PASSWORD` | Bcrypt-хэш пароля администратора |

**Критично:** `WALLET_MNEMONIC` содержит пробелы → нельзя `source .env` в bash!

### Replit (dev)

Те же переменные через Replit Secrets + setEnvVars:
- `ADMIN_PASSWORD` = `$2b$12$KaZD8ignMUIPJ7pXoJ9Vp.nq9GXv8S9ybJ07TQV4rlBIobgLS3U8O`

---

## 4. Доступ в Admin Panel

| | |
|-|-|
| **URL** | https://hex.aliterra.space/admin |
| **Пароль** | `Dim_230880` |

Хэш в `.env` на сервере. API загружает его при старте через встроенный загрузчик.

---

## 5. Хронология — что было сделано

### Базовая инфраструктура
- Monorepo (pnpm workspaces), Express API + React/Vite фронтенд
- PostgreSQL + Drizzle ORM
- Аутентификация (email + bcrypt, express-session)
- Базовые торговые роуты

### Блокчейн и кошельки
- HD Wallet (BIP44), депозитные адреса (уникальные на пользователя)
- Мониторинг депозитов on-chain (`eth_getLogs`)
- Вывод нативных монет и ERC-20 токенов

### Торговый терминал
- График цен (CoinGecko OHLC → TradingView-свечи)
- Ордербук (bid/ask в реальном времени)
- Форма ордеров (limit, market), матчинг-движок
- SSE-стрим `/api/market/stream`
- Ресайзируемые панели с сохранением в localStorage

### Панель администратора (7 разделов)
- Дашборд с навигацией
- Управление пользователями (список, профиль, блокировка)
- Управление торговыми парами (добавить, вкл/выкл)
- Листинг токенов (ERC-20/BEP-20, делистинг)
- Конфигурация комиссий (maker/taker/вывод по каждому активу)
- Реферальная программа (тип награды, %, мин. объём)
- Мониторинг транзакций (все депозиты/выводы, авто-обновление 15с)
- Журнал аудита

---

## 6. Проблемы и решения

### ADMIN_PASSWORD не работал на продакшне (длинная отладка)

**Симптом:** `POST /api/admin/login` → `401 Invalid password` на hex.aliterra.space

**Цепочка ошибок:**

| Попытка | Что делали | Результат |
|---------|-----------|-----------|
| 1 | Записать хэш в .env через sed в deploy.yml, `pm2 restart nexex` | 401 — PM2 использует старый env из ecosystem.config.cjs |
| 2 | Добавить `source .env` в deploy.yml + `pm2 restart --update-env` | ОШИБКА: `squeeze: command not found` — слова мнемоники воспринимались bash как команды |
| 3 | Добавить пакет `dotenv` в api-server | ОШИБКА: `Could not resolve "dotenv/config"` — пакет не установлен на сервере (deploy не запускает `pnpm install`) |
| 4 | Встроенный загрузчик .env через Node.js fs, но без перезаписи | 401 — PM2 всё ещё имел старое значение, загрузчик пропускал уже установленные переменные |
| **5** | **Загрузчик с принудительной перезаписью** | **✓ РАБОТАЕТ** |

**Финальное решение** (`artifacts/api-server/src/index.ts`):
```typescript
(function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    let val = line.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    process.env[key] = val; // всегда перезаписываем PM2-значения
  }
})();
```

**Ключевой инсайт:** PM2 хранит env vars в `ecosystem.config.cjs` и не обновляет их при `pm2 restart` без `--update-env`. Решение — читать `.env` напрямую в коде сервера при каждом старте.

### WALLET_MNEMONIC с пробелами

**Проблема:** `source .env` в bash → `squeeze: command not found`  
**Решение:** Только `grep + cut` для извлечения конкретных переменных:
```bash
DATABASE_URL=$(grep '^DATABASE_URL=' .env | head -1 | cut -d'=' -f2-)
```

### Сессии за nginx

**Проблема:** Cookie не передавались, сессии терялись  
**Решение:** `app.set("trust proxy", 1)` в app.ts (строка 12)

### CoinGecko 429/400

**Проблема:** Превышение лимитов бесплатного API при синхронизации свечей  
**Текущее состояние:** Ошибки логируются, сервер не крашает. Данные могут подгружаться с задержкой.

---

## 7. Что делать дальше

### Высокий приоритет
- [ ] **Реферальная система** — поле `referral_code` при регистрации, трекинг, начисление наград
- [ ] **Email-уведомления** — подтверждение регистрации, уведомления о транзакциях
- [ ] **Хранение сессий в БД** — сейчас in-memory, теряются при рестарте PM2
- [ ] **KYC/лимиты** — ограничения вывода без верификации

### Средний приоритет
- [ ] **WebSocket** вместо SSE — надёжнее для real-time
- [ ] **Rate limiting** на API — защита от спама ордерами
- [ ] **Профиль пользователя** — смена пароля, настройки
- [ ] **2FA для администратора** — TOTP
- [ ] **Страница Markets** — полный список с сортировкой по объёму

### Низкий приоритет
- [ ] Мобильная адаптация торгового терминала
- [ ] Экспорт истории сделок (CSV)
- [ ] Публичный API для трейдеров с документацией
- [ ] Загрузка логотипа через admin-панель

---

## 8. Критические правила разработки

### Деплой фронтенда

```bash
# После ЛЮБОГО изменения UI — пересборка обязательна!
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/cex-exchange run build
git add artifacts/cex-exchange/dist/
git commit -m "build: rebuild frontend"
git push origin main
# Одобрить на https://github.com/aliter230880/CEX/actions
```

### В deploy.yml — НЕЛЬЗЯ

```bash
source .env          # ЛОМАЕТ: мнемоника с пробелами
pnpm install         # НЕ запускается при деплое
pm2 restart --update-env  # Не работает без правильного env в shell
```

### Парсинг торговых пар

Все роуты нормализуют: `.replace(/[-_]/g, "/")` → `BTC-USDT` = `BTC_USDT` = `BTC/USDT`

### CoinGecko OHLC → интервалы свечей

| days | Интервал |
|------|----------|
| 1 | 30m |
| 2 | 1h |
| 7 | 4h |
| 30 | 1d |

### PM2 на сервере

```bash
pm2 restart nexex     # Перезапуск (ADMIN_PASSWORD берётся из .env автоматически)
pm2 logs nexex        # Просмотр логов
pm2 status            # Статус процессов
# Конфиг: /root/nexex/ecosystem.config.cjs (генерировался из .env)
```
