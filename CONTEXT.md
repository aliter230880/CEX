# ATEX Exchange — Полный контекст проекта

> Обновлено: 16 апреля 2026  
> Статус: **В активной разработке** — продакшн работает на https://hex.aliterra.space  
> Репозиторий: https://github.com/aliter230880/CEX

---

## 1. Что такое проект

**ATEX** — полноценная централизованная криптобиржа (CEX) с:
- Спотовой торговлей (биржевой стакан, матчинг-движок)
- Реальными HD-кошельками на базе мнемоники (BIP39/BIP44)
- Мониторингом депозитов on-chain (ETH, BSC через Moralis, Polygon)
- Ордербуком и историей сделок в реальном времени
- Графиком цен (TradingView-совместимый, данные через CoinGecko)
- Полноценной панелью управления для администратора
- Кастомными ERC-20/BEP-20 токенами с ценовыми источниками

**Продакшн URL:** https://hex.aliterra.space  
**VPS:** 89.111.152.187 (Ubuntu 24.04, 1 GB RAM), путь `/root/nexex`  
**SSH:** root@89.111.152.187, пароль хранится у владельца

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
| `POST /api/auth/register` | auth.ts | Регистрация (баланс = 0, без стартовых средств) |
| `GET /api/auth/me` | auth.ts | Текущий пользователь |
| `GET /api/market/pairs` | market.ts | Список торговых пар |
| `GET /api/market/ticker/:pair` | market.ts | Цена и 24h изменение (поле: `pair`, не `symbol`!) |
| `GET /api/market/tickers` | market.ts | Все тикеры (массив объектов с полем `pair`) |
| `GET /api/market/klines/:pair` | market.ts | OHLCV свечи |
| `GET /api/market/stream` | market.ts | SSE real-time поток цен |
| `GET /api/orderbook/:pair` | orderbook.ts | Стакан (bid/ask) |
| `GET /api/market/recent-trades/:pair` | market.ts | Последние сделки |
| `GET/POST /api/orders` | orders.ts | Создание и список ордеров |
| `DELETE /api/orders/:id` | orders.ts | Отмена ордера |
| `GET /api/trades` | trades.ts | История сделок пользователя |
| `GET /api/balances` | balances.ts | Балансы пользователя |
| `GET /api/wallet/deposit-address/:network` | wallet.ts | Адрес для депозита (с динамическими активами) |
| `GET /api/wallet/supported-assets` | wallet.ts | Все поддерживаемые активы по сетям (включая кастомные) |
| `GET /api/wallet/transactions` | wallet.ts | История транзакций пользователя |
| `POST /api/wallet/withdraw` | wallet.ts | Запрос на вывод (включая кастомные ERC-20) |
| `POST /api/admin/login` | admin.ts | Вход администратора |
| `GET /api/admin/me` | admin.ts | Статус сессии администратора |
| `GET /api/admin/users` | admin.ts | Список пользователей |
| `GET /api/admin/users/:id` | admin.ts | Детали пользователя |
| `PATCH /api/admin/users/:id` | admin.ts | Блокировка/разблокировка |
| `GET /api/admin/trading-pairs` | admin.ts | Управление парами |
| `POST /api/admin/trading-pairs` | admin.ts | Добавить пару |
| `PATCH /api/admin/trading-pairs/:id` | admin.ts | Вкл/выкл пару |
| `GET /api/admin/tokens` | admin.ts | Листинг кастомных токенов (hasPair в ответе) |
| `POST /api/admin/tokens` | admin.ts | Добавить токен (авто-создаёт пару + seed klines) |
| `PATCH /api/admin/tokens/:id` | admin.ts | Обновить цену токена (manual_price_usd / price_contract_address) |
| `POST /api/admin/tokens/:id/create-pair` | admin.ts | Вручную создать торговую пару для токена |
| `DELETE /api/admin/tokens/:id` | admin.ts | Делистинг токена |
| `GET/PUT /api/admin/fees/:asset` | admin.ts | Комиссии по активу |
| `GET/PUT /api/admin/referrals` | admin.ts | Реферальная программа |
| `GET /api/admin/transactions` | admin.ts | Все депозиты/выводы |
| `GET /api/admin/audit-log` | admin.ts | Журнал действий |
| `POST /api/admin/reset-test-balances` | admin.ts | Сброс всех балансов пользователей до 0 |

**Ключевые библиотеки:**
- `express-session` — сессии (хранятся в памяти процесса, теряются при рестарте PM2)
- `bcryptjs` — хэширование паролей
- `ethers.js v6` — работа с блокчейном
- `drizzle-orm` + `pg` — ORM для PostgreSQL
- `pino` + `pino-http` — структурированное логирование

**Особенности:** При старте загружает `.env` через встроенный Node.js `fs` — читает файл и **принудительно перезаписывает** process.env, включая переменные установленные PM2. Это критично: значения из `.env` всегда актуальнее ecosystem.config.cjs.

### 2.3 Frontend (`artifacts/cex-exchange`)

**Стек:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + wouter (роутинг)

**Страницы:**
```
/              → Landing — лендинг с живыми ценами
/markets       → Список всех торговых пар
/trade/:pair   → Торговый терминал (график + стакан + форма)
/login         → Вход пользователя
/register      → Регистрация
/wallet        → Кошелёк (депозит / вывод — динамические активы с API)
/orders        → Мои ордера

/admin/login       → Вход в панель администратора
/admin             → Дашборд (7 секций + Danger Zone)
/admin/users       → Список пользователей с поиском
/admin/users/:id   → Профиль пользователя
/admin/trading-pairs → Управление торговыми парами
/admin/tokens      → Листинг ERC-20/BEP-20 токенов (кнопка «Create Pair»)
/admin/fees        → Комиссии (maker/taker/вывод) по активам
/admin/referrals   → Реферальная программа
/admin/transactions → Мониторинг транзакций (авто-обновление 15с)
/admin/audit-log   → Журнал действий администратора
```

**Ресайзируемые панели (localStorage):**
- Боковое меню торговых пар: 160–400px (`use-sidebar-width.ts`)
- Ордербук / форма ордера: `use-resizable-panels.ts`
- Компонент разделителя: `ResizableDivider.tsx`

**Важно:** `dist/` коммитится в git и деплоится как статические файлы — API раздаёт их из `dist/public`. После изменений UI **обязательна пересборка на Replit** (никогда на VPS — недостаточно RAM):
```bash
pnpm --filter @workspace/cex-exchange run build
git add -f artifacts/cex-exchange/dist/
git commit -m "build: rebuild frontend"
git push
```

**Критично — тикеры API:** `GET /api/market/tickers` возвращает объекты с полем `pair` (например `"ETH-USDT"`), **не** `symbol`. В wallet.tsx priceMap строится через `t.pair.split("-")`.

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
| `custom_tokens` | ERC-20/BEP-20 токены (расширена: `manual_price_usd`, `price_contract_address`) |

**`custom_tokens` — полная схема колонок:**
- `id`, `symbol`, `name`, `network` (eth/bsc/polygon — строчными!), `contract_address`, `decimals`
- `status` (active/delisted), `icon_url`
- `manual_price_usd` — ручная цена в USDT (если не задан price_contract_address)
- `price_contract_address` — адрес смарт-контракта для получения цены (LuxEx или аналог)
- `created_at`

> **Важно:** колонка называется `network`, **не** `chain`. В Drizzle: `eq(customTokensTable.network, "polygon")`.

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

**Мониторинг депозитов — два механизма:**

| Файл | Механизм | Сети |
|------|----------|------|
| `deposit-monitor.ts` | `eth_getLogs` через публичные RPC | ETH, BSC, Polygon |
| `etherscan-monitor.ts` | Etherscan/Moralis API | ETH, Polygon (Etherscan), BSC (Moralis) |

**Текущий активный мониторинг (`etherscan-monitor.ts`):**
- ETH — Etherscan V2 API (ключ: `ETHERSCAN_API_KEY`, chainid=1)
- Polygon — Etherscan V2 API (тот же ключ, chainid=137)
- BSC — **Moralis API** (`MORALIS_API_KEY`), эндпоинт `deep-index.moralis.io/api/v2.2`
  - Использует `/address/erc20/transfers` и `/address` для нативных BNB
  - Параметр `limit=100` (максимум у Moralis), `from_block` передаётся только если > 0
  - Никогда не передавать `from_block=0` — Moralis возвращает 400
- Опрос каждые 60 секунд, `batchMaxCount: 1` на всех JsonRpcProvider

**Кастомные токены в мониторинге:**
- Каждый цикл читает `custom_tokens` WHERE network = текущая сеть
- Сканирует Transfer-события кастомных ERC-20
- После подтверждения — автоматическое зачисление баланса

**Динамические активы кошелька (`wallet.ts`):**
- `getSupportedAssets(network)` — объединяет встроенные + кастомные из БД
- `resolveAssetConfig(asset, network)` — async-резолвер, поддерживает кастомные ERC-20
- Депозитный адрес включает кастомные токены в список принимаемых активов

**Ценовые источники для кастомных токенов (`price-feed.ts`):**
- Если задан `price_contract_address` → читает цену из смарт-контракта LuxEx на Polygon
- Если только `manual_price_usd` → использует эту цену напрямую
- Обновление каждые 60 секунд

**Горячий кошелёк:** `HOT_WALLET_PRIVATE_KEY` — для выводов пользователям

**Критические настройки ethers.js:**
- `batchMaxCount: 1` на ВСЕХ JsonRpcProvider (избегает batching ошибок)
- `ethers.Network.from(chainId)` для явного указания сети (предотвращает detection loops)

### 2.6 VPS и PM2

**Сервер:** Ubuntu 24.04, `/root/nexex`, **только 1 GB RAM**

```
PM2 процессы:
  id=0  aliterra  — фронтенд nginx-reverse-proxy или другой сервис
  id=2  nexex     — API сервер (artifacts/api-server/dist/index.mjs)
```

**КРИТИЧНО:** PM2 nexex — ID=2. После `pm2 delete nexex` и `pm2 start ecosystem.config.cjs` ID изменился. Всегда использовать ID=2 или имя "nexex" для рестарта.

**Конфиг:** `/root/nexex/ecosystem.config.cjs` — содержит все env переменные включая MORALIS_API_KEY и ETHERSCAN_API_KEY. Добавление новых переменных: редактировать файл напрямую.

**PORT на VPS:** `PORT=3000` (не 8080!)

**Nginx:** reverse proxy с `app.set("trust proxy", 1)` — обязательно для сессионных cookie

### 2.7 CI/CD Pipeline (два варианта)

#### Вариант A: GitHub Actions (официальный)

```
git push → GitHub Actions:
  1. Список изменений (автоматически)
  2. Ожидание ручного одобрения (environment: production)
  3. SSH на VPS (appleboy/ssh-action):
     a. git fetch + reset --hard origin/main
     b. drizzle-kit push (миграции схемы)
     c. esbuild (сборка API → dist/index.mjs)
     d. pm2 restart nexex
```

#### Вариант B: Прямой SSH (быстрый, без одобрения)

```bash
# Сборка фронтенда (ТОЛЬКО на Replit!)
pnpm --filter @workspace/cex-exchange run build
git add -f artifacts/cex-exchange/dist/
git commit -m "build: rebuild"
git push https://TOKEN@github.com/aliter230880/CEX.git main

# Деплой на VPS (SSH)
sshpass -p 'PASSWORD' ssh root@89.111.152.187 "
  cd /root/nexex
  git pull origin main
  pnpm --filter @workspace/api-server run build
  pm2 restart 2 --update-env
"
```

**PM2 рестарт с обновлением env:** `pm2 restart 2 --update-env` (обязательно после изменения переменных)

### 2.8 Workflow разработки

1. Вносим изменения в Replit
2. Если изменён фронтенд → `pnpm --filter @workspace/cex-exchange run build` на Replit (никогда на VPS!)
3. Коммитим и пушим в GitHub (фронтенд dist включается принудительно: `git add -f`)
4. Деплоим через GitHub Actions (одобрение владельца) или прямым SSH

---

## 3. Переменные окружения

### VPS (`/root/nexex/ecosystem.config.cjs` и `.env`)

| Переменная | Описание | Значение |
|-----------|----------|---------|
| `PORT` | Порт API сервера | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | в ecosystem.config.cjs |
| `SESSION_SECRET` | Секрет express-session | в ecosystem.config.cjs |
| `WALLET_MNEMONIC` | BIP39 мнемоника (12 слов через пробелы!) | **спросить у владельца** |
| `HOT_WALLET_PRIVATE_KEY` | Private key горячего кошелька | **спросить у владельца** |
| `ADMIN_PASSWORD` | Bcrypt-хэш пароля администратора | в .env на VPS |
| `ETHERSCAN_API_KEY` | API ключ Etherscan (ETH + Polygon) | в ecosystem.config.cjs |
| `MORALIS_API_KEY` | API ключ Moralis (BSC мониторинг) | в ecosystem.config.cjs |
| `FRONTEND_DIST` | Путь к статике фронтенда | `/root/nexex/artifacts/cex-exchange/dist/public` |

**Критично:** `WALLET_MNEMONIC` содержит пробелы → нельзя `source .env` в bash! Только через `grep + cut`:
```bash
DATABASE_URL=$(grep '^DATABASE_URL=' .env | head -1 | cut -d'=' -f2-)
```

### Replit (dev)

Те же переменные через Replit Secrets (ADMIN_PASSWORD, SESSION_SECRET, WALLET_MNEMONIC, HOT_WALLET_PRIVATE_KEY, ETHERSCAN_API_KEY).

---

## 4. Доступ

| | |
|-|-|
| **Продакшн URL** | https://hex.aliterra.space |
| **Admin Panel** | https://hex.aliterra.space/admin |
| **Admin Password** | `Dim_230880` |
| **VPS IP** | 89.111.152.187 |
| **GitHub repo** | https://github.com/aliter230880/CEX |

---

## 5. Важные данные о токенах и балансах

### Кастомный токен LUX

| Параметр | Значение |
|---------|---------|
| Contract | `0x7324c346b47250A3e147a3c43B7A1545D0dC0796` |
| Сеть | Polygon |
| Баланс у пользователя | 3000 LUX (в БД) |

**Wallet page:** кастомные токены теперь отображаются — `wallet.tsx` показывает все активы из `balances` таблицы с ненулевым количеством (не только те, что в `supported-assets`). Если у токена нет цены в priceMap — не считается в totalUSD (не крашит).

### USDC на Polygon
`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`

### Ценовые контракты
LuxEx на Polygon: `0xe564...` (полный адрес в price-feed.ts), метод `getPrice(tokenAddr) → uint256`

---

## 6. Хронология — что было сделано

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
- Листинг токенов (ERC-20/BEP-20, делистинг, кнопка Create Pair)
- Конфигурация комиссий (maker/taker/вывод по каждому активу)
- Реферальная программа (тип награды, %, мин. объём)
- Мониторинг транзакций (все депозиты/выводы, авто-обновление 15с)
- Журнал аудита
- Danger Zone: сброс всех балансов до нуля (двойное подтверждение)

### Кастомные токены — полная интеграция
- Схема `custom_tokens` расширена: `manual_price_usd`, `price_contract_address`
- Авто-создание торговой пары + seed klines при добавлении токена
- Ценовой фид: смарт-контракт LuxEx или manual_price_usd, обновление каждые 60 сек
- Мониторинг Transfer-событий кастомных ERC-20 в deposit-monitor

### Динамический кошелёк (кастомные токены)
- `getSupportedAssets(network)` — объединяет встроенные + кастомные из БД
- Фронтенд `wallet.tsx` — убран хардкод, активы загружаются с API
- Депозит и вывод кастомных токенов работают через единый EVM-адрес
- Кастомные токены с ненулевым балансом показываются в кошельке

### Нулевые стартовые балансы
- При регистрации убраны тестовые 10k USDT / 0.5 BTC / 5 ETH / 10 BNB / 1000 POL
- Новые пользователи начинают с 0 — обязательно пополнить через депозит

### BSC мониторинг через Moralis
- BscScan API недоступен бесплатно → интегрирован Moralis API
- `etherscan-monitor.ts` содержит `scanAddressOnBscMoralis()` с правильными параметрами
- Лимит: `limit=100` (максимум Moralis), `from_block` только при fromBlock > 0
- `MORALIS_API_KEY` добавлен в `ecosystem.config.cjs` на VPS и в Replit Secrets

### Исправления wallet page (апрель 2026)
- **Отображение LUX:** кастомные токены теперь берутся из `/api/balances`, а не только из supported-assets
- **Правильный общий баланс:** totalUSD считается по реальным ценам из тикеров, не сумме сырых чисел
- **Краш priceMap:** `t.symbol is undefined` → исправлено на `t.pair` (так называется поле в API)
- **POL задвоение:** исправлен баланс в БД (0.20 → 0.10), удалена дублирующая транзакция

---

## 7. Проблемы и решения

### ADMIN_PASSWORD не работал на продакшне

**Симптом:** `POST /api/admin/login` → `401 Invalid password` на hex.aliterra.space

**Причина:** PM2 хранит env vars в `ecosystem.config.cjs`, при `pm2 restart` без `--update-env` не обновляет их. При этом `source .env` в bash ломался из-за WALLET_MNEMONIC с пробелами.

**Решение:** Встроенный загрузчик `.env` в `artifacts/api-server/src/index.ts`, который принудительно перезаписывает `process.env` при каждом старте сервера. Значения из `.env` всегда перекрывают то, что PM2 передал.

### WALLET_MNEMONIC с пробелами

**Проблема:** `source .env` → `squeeze: command not found` (слова мнемоники = bash команды)  
**Решение:** Только `grep + cut` для конкретных переменных, никогда `source`

### Сессии за nginx

**Проблема:** Cookie не передавались, сессии терялись  
**Решение:** `app.set("trust proxy", 1)` в app.ts

### CoinGecko 429/400

**Проблема:** Превышение лимитов бесплатного API  
**Текущее состояние:** Ошибки логируются, сервер не крашает. CoinGecko 429 на старте — норма.

### deposit-monitor: ошибка `.chain` вместо `.network`

**Проблема:** `customTokensTable.chain` — поля нет, правильное: `.network`  
**Симптом:** `syntax error at or near "="` в SQL  
**Решение:** `eq(customTokensTable.network, networkKey)` (коммит 351c482)

### Moralis BSC 400 ошибка

**Проблема:** `Moralis API HTTP 400` при вызове с `limit=200` и `from_block=0`  
**Причина 1:** Moralis максимум `limit=100`  
**Причина 2:** Передача `from_block=0` вызывает 400  
**Решение:** `limit: "100"`, `from_block` только если `fromBlock > 0` (коммит 1ea6370)

### wallet.tsx краш (t.symbol is undefined)

**Проблема:** Страница кошелька падала с `can't access property "split", t.symbol is undefined`  
**Причина:** `GET /api/market/tickers` возвращает объекты с полем `pair`, не `symbol`  
**Решение:** Исправить `t.symbol.split("-")` → `t.pair.split("-")` + добавить guard `if (!t?.pair) continue` (коммит 6759740)

### VPS 1GB RAM — невозможна сборка фронтенда

**Проблема:** `pnpm --filter @workspace/cex-exchange run build` на VPS → SSH timeout/OOM  
**Решение:** Фронтенд собирается **только на Replit**, `dist/` коммитится в git (`.gitignore` имеет исключение для этой папки), VPS только делает `git pull` + `pm2 restart`

### PM2 nexex ID изменился

**Проблема:** После `pm2 delete nexex` + `pm2 start ecosystem.config.cjs` — nexex получил новый ID (был 1, стал 2)  
**Решение:** Всегда проверять ID через `pm2 status`. Текущий ID=2. Использовать `pm2 restart 2 --update-env` или `pm2 restart nexex --update-env`

---

## 8. Что делать дальше

### Высокий приоритет
- [ ] **Хранение сессий в БД** — сейчас in-memory, теряются при рестарте PM2 (connect-pg-simple)
- [ ] **KYC/лимиты** — ограничения вывода без верификации (поле kyc_level в users)
- [ ] **Email-уведомления** — подтверждение регистрации, уведомления о транзакциях
- [ ] **2FA для администратора** — TOTP

### Средний приоритет
- [ ] **WebSocket** вместо SSE — надёжнее для real-time
- [ ] **Rate limiting** на API — защита от спама ордерами
- [ ] **Профиль пользователя** — смена пароля, настройки
- [ ] **Реферальная система** — поле `referral_code` при регистрации, трекинг, начисление наград

### Низкий приоритет
- [ ] Мобильная адаптация торгового терминала
- [ ] Экспорт истории сделок (CSV)
- [ ] Публичный API для трейдеров с документацией
- [ ] Загрузка логотипа через admin-панель

---

## 9. Критические правила разработки

### Деплой фронтенда — ТОЛЬКО с Replit

```bash
# ПРАВИЛЬНО (на Replit):
pnpm --filter @workspace/cex-exchange run build
git add -f artifacts/cex-exchange/dist/
git commit -m "build: rebuild frontend"
git push

# НЕПРАВИЛЬНО (на VPS — OOM/timeout при 1GB RAM):
# pnpm --filter @workspace/cex-exchange run build  ← НИКОГДА
```

### Прямой деплой на VPS (быстрый путь)

```bash
# На VPS:
cd /root/nexex
git pull origin main
pnpm --filter @workspace/api-server run build   # только API, быстро (2 сек)
pm2 restart 2 --update-env                      # ID=2, nexex
pm2 save
```

### В deploy.yml — НЕЛЬЗЯ

```bash
source .env              # ЛОМАЕТ: мнемоника с пробелами как bash-команды
pnpm install             # НЕ запускается при деплое (нет в скрипте)
pnpm build cex-exchange  # OOM на VPS с 1GB RAM
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
pm2 status                        # Текущий nexex: ID=2
pm2 restart 2 --update-env        # Рестарт с обновлением env
pm2 restart nexex --update-env    # То же самое по имени
pm2 logs nexex --lines 50         # Последние логи
pm2 save                          # Сохранить конфиг (после delete/start)
```

### Кастомный токен — инструкция после добавления

1. Admin → Token Listing → нажать жёлтую кнопку "Create Pair" для токена
2. Или: `POST /api/admin/tokens/:id/create-pair` — создаёт пару автоматически
3. Токен появится в кошельке (Deposit/Withdraw) автоматически — без хардкода
4. Цена обновляется каждые 60 сек из смарт-контракта (если задан) или из manual_price_usd

### ethers.js — обязательные настройки

```typescript
const provider = new ethers.JsonRpcProvider(rpcUrl, network, { batchMaxCount: 1 });
const network = ethers.Network.from(chainId); // явная инициализация, без auto-detect
```

### CONTEXT.md

Файл добавлен в `.gitignore` — хранится только локально в Replit.  
Обновлять вручную после значимых изменений в проекте.
