# ATEX Exchange — Полный контекст проекта

> Обновлено: 18 апреля 2026  
> Статус: **Продакшн работает** — https://hex.aliterra.space  
> Репозиторий: https://github.com/aliter230880/CEX  
> Следующий этап: торговые боты для CEX-симуляции + CoinGecko API

---

## 1. Что такое проект

**ATEX** — полноценная централизованная криптобиржа (CEX) с:
- Спотовой торговлей (биржевой стакан, матчинг-движок)
- Реальными HD-кошельками на базе мнемоники (BIP39/BIP44)
- Мониторингом депозитов on-chain (ETH, BSC через Moralis, Polygon через Alchemy)
- Ордербуком и историей сделок в реальном времени
- Графиком цен (TradingView-совместимый, данные через CoinGecko)
- Панелью администратора (управление парами, токенами, пользователями, комиссиями)
- Кастомными ERC-20/BEP-20 токенами (в т.ч. LUX на Polygon) с ценовыми источниками
- Glassmorphism dark дизайном (единая система на всех страницах)

**Продакшн URL:** https://hex.aliterra.space  
**VPS:** 89.111.152.187 (Ubuntu 24.04, 1 GB RAM), путь `/root/nexex`  
**SSH:** root@89.111.152.187 (пароль у владельца)  
**GitHub:** https://github.com/aliter230880/CEX

---

## 2. Архитектура системы

### 2.1 Monorepo (pnpm workspaces)

```
/workspace
├── artifacts/
│   ├── api-server/          # Express.js API (TypeScript → esbuild → dist/index.mjs)
│   │   └── dist/            # ✅ Коммитится в git (CI pre-build)
│   └── cex-exchange/        # React + Vite фронтенд
│       └── dist/public/     # ✅ Коммитится в git (CI pre-build)
├── lib/
│   └── db/                  # Drizzle ORM + PostgreSQL схемы и миграции
└── .github/workflows/
    └── deploy.yml           # CI/CD (см. раздел 5)
```

### 2.2 API Server (`artifacts/api-server`)

**Стек:** Node.js + Express + TypeScript → esbuild → `dist/index.mjs`

**Роуты:**
| Маршрут | Описание |
|---------|----------|
| `GET /api/health` | Проверка доступности |
| `POST /api/auth/login` | Вход пользователя |
| `POST /api/auth/register` | Регистрация |
| `GET /api/auth/me` | Текущий пользователь |
| `GET /api/market/pairs` | Список торговых пар |
| `GET /api/market/ticker/:pair` | Цена и 24h изменение (поле `pair`, не `symbol`!) |
| `GET /api/market/tickers` | Все тикеры |
| `GET /api/market/klines/:pair` | OHLCV свечи |
| `GET /api/market/stream` | SSE real-time поток |
| `GET /api/orderbook/:pair` | Стакан (bid/ask) |
| `GET /api/market/recent-trades/:pair` | Последние сделки |
| `GET/POST /api/orders` | Ордера |
| `DELETE /api/orders/:id` | Отмена ордера |
| `GET /api/trades` | История сделок |
| `GET /api/balances` | Балансы |
| `GET /api/wallet/deposit-address/:network` | Адрес депозита |
| `GET /api/wallet/supported-assets` | Поддерживаемые активы |
| `GET /api/wallet/transactions` | История транзакций |
| `POST /api/wallet/withdraw` | Запрос вывода |
| `POST /api/admin/login` | Вход администратора |
| `GET /api/admin/users` | Список пользователей |
| `PATCH /api/admin/users/:id` | Блокировка/разблокировка |
| `GET/POST /api/admin/trading-pairs` | Управление парами |
| `GET/POST /api/admin/tokens` | Листинг токенов |
| `PATCH /api/admin/tokens/:id` | Обновить цену токена |
| `POST /api/admin/tokens/:id/create-pair` | Создать пару для токена |
| `DELETE /api/admin/tokens/:id` | Делистинг токена |
| `GET/PUT /api/admin/fees/:asset` | Комиссии по активу |

### 2.3 Фронтенд (`artifacts/cex-exchange`)

**Стек:** React + Vite + TypeScript + TailwindCSS + shadcn/ui

**Страницы:** Landing, Login, Register, Exchange (trading), Markets, Wallet, Admin Panel

**Дизайн-система (Glassmorphism Dark — применена апрель 2026):**
- Фон: градиент `#080c18 → #0d1428 → #18082a`
- Акцентный цвет: `#00ff88` (зелёный)
- Компоненты: `.atex-glass`, `.atex-glass-card`, `.atex-glass-header`
- Шрифт: Inter
- Страницы: landing, login, register, layout (header + sidebar) — единый стиль

### 2.4 База данных (PostgreSQL + Drizzle ORM)

**Схемы:** users, balances, orders, trades, trading_pairs, tokens, transactions, fees, deposits, wallets

---

## 3. Токен LUX — статус и стратегия

### Что такое LUX
- ERC-20/BEP-20 токен на Polygon
- Добавлен в ATEX как кастомный токен с торговой парой LUX/USDT
- **Внешний держатель:** ~2,000,000 LUX (критический фактор для выбора стратегии)

### Принятая стратегия (апрель 2026)

**❌ DEX-пул (QuickSwap/Uniswap) — ОТКАЗАНО:**
- Держатель с 2M LUX может опустошить любой пул
- Риск неконтролируемого обвала цены

**✅ Комбинированная стратегия:**
1. **CEX-симуляция** — боты торгуют LUX/USDT внутри ATEX (бесплатно, без газа)
2. **On-chain активность** — периодические wallet-to-wallet ERC-20 трансферы LUX между кошельками ботов (~5-10/день, ~0.003 POL/трансфер)
3. **CoinGecko листинг через CEX API** — публичный `/api/v1/tickers` → заявка на листинг ATEX → парсинг LUX с нашей биржи (полный контроль над ценой и объёмом)

---

## 4. CI/CD — финальное решение и история проблем

### Текущая рабочая схема деплоя ✅

```
Push to main
  → GitHub Actions (timeout-minutes: 20):
      pnpm install
      → pnpm build cex-exchange (Vite, ~5s с кешем)
      → pnpm build api-server (esbuild, ~1s)
      → git add -f dist/ → git pull --rebase → git push [skip ci]
  → appleboy/ssh-action (command_timeout: 5m):
      git reset --hard origin/main
      → timeout 60 pnpm db push
      → pm2 restart nexex
```

**Итого ~7-10 минут. Сервер НЕ строит ничего — только git pull + pm2 restart.**

### Ключевые решения

**Pre-build на GitHub CI:**  
Оба `dist/` собираются на CI и коммитятся в репо с `[skip ci]`. Исключения в `.gitignore`:
```
!artifacts/cex-exchange/dist/
!artifacts/api-server/dist/
```

**git pull --rebase перед push:**  
Предотвращает `non-fast-forward` если параллельно были пуши (в т.ч. от нас самих).

**timeout 60 pnpm db push:**  
Предотвращает зависание DB-миграции на неопределённое время.

**timeout-minutes: 20 на job уровне:**  
GitHub Actions убивает зависший job не позднее 20 минут.

### История проблем деплоя (хронология)

| # | Метод | Что пошло не так |
|---|-------|-----------------|
| 1 | Vite build на VPS | OOM (1GB RAM), таймаут >30 мин |
| 2 | Docker scp-action | Контейнер висел 944 сек без результата |
| 3 | sshpass + scp | `Connection closed` exit 255 — VPS отвергал SCP |
| 4 | CI build → git commit dist | `non-fast-forward` (параллельный push) |
| 5 | + git pull --rebase | SSH action завис на 2.5 часа, сервер перегрузился |
| **6 ✅** | **Ручной SSH из Replit после reboot VPS** | **Успех за 2 минуты** |

### Критический инцидент 18 апреля 2026

SSH-сессия GitHub Actions (`appleboy/ssh-action`) зависла на **2 часа 37 минут**. Предположительная причина: команда `pnpm db push` не отвечала, SSH-сессия не завершалась. SSH-демон на сервере перегрузился и перестал принимать новые соединения.

**Решение:** hard reboot VPS через панель хостера → ручной деплой через SSH из Replit за 2 минуты.

### Быстрый ручной деплой (если CI завис)

```bash
SSHPASS="<пароль>" sshpass -e ssh -o StrictHostKeyChecking=no root@89.111.152.187 '
  cd /root/nexex
  git fetch origin main && git reset --hard origin/main
  timeout 60 pnpm --filter @workspace/db run push
  pm2 restart nexex
  pm2 status
'
```

### Запреты в SSH-скрипте деплоя

```bash
source .env        # ЛОМАЕТ: мнемоника с пробелами → bash-ошибки
pnpm install       # Не нужен: node_modules уже есть на сервере
pnpm build         # Не строить на сервере: OOM и таймауты
```

---

## 5. Следующие задачи (приоритет)

### 5.1 Торговые боты — CEX симуляция ⏳

**Цель:** живая активность на бирже, история торгов, движение курсов

**Архитектура:**
- Пакет `bot-service` (Node.js скрипт), запускается через PM2 рядом с API
- 2-3 бот-аккаунта в БД с предзаполненными балансами (не реальные средства)
- Используют REST API: login → place order → матчинг закрывает сделку

**Логика цены:**
- Базовая цена + синусоидальный тренд + случайный шум
- Паттерн: рост 3-7% → коррекция 2-4% → снова рост
- Спред bid/ask: 0.2-0.5% от текущей цены
- Интервал: 30-90 сек между парами ордеров (рандомно)

**Охват:** все пары — BTC/USDT, ETH/USDT, BNB/USDT, POL/USDT, SOL/USDT, LUX/USDT

### 5.2 CoinGecko-совместимый API ⏳

**Эндпоинты (формат CoinGecko Exchange API v1):**
```
GET /api/v1/pairs
GET /api/v1/tickers
GET /api/v1/orderbook?ticker_id=LUX_USDT
GET /api/v1/historical_trades?ticker_id=LUX_USDT
```

После реализации → заявка на листинг ATEX на CoinGecko.

### 5.3 On-chain активность LUX ⏳

- Периодические ERC-20 трансферы LUX между кошельками ботов
- ~5-10 в день, виден на Polygonscan
- Стоимость: ~0.003 POL/трансфер → ~0.03-0.09 POL/день (~$0.006-0.018)

---

## 6. Технические константы и gotchas

### Парсинг торговых пар
```typescript
pair.replace(/[-_]/g, "/")  // BTC-USDT = BTC_USDT = BTC/USDT
```

### PM2 на сервере
```bash
pm2 status                  # nexex (ID=1), aliterra (ID=0)
pm2 restart nexex           # рестарт по имени
pm2 logs nexex --lines 50   # логи
pm2 save                    # сохранить конфиг после изменений
```

### ethers.js — обязательные настройки
```typescript
const provider = new ethers.JsonRpcProvider(rpcUrl, network, { batchMaxCount: 1 });
const network = ethers.Network.from(chainId); // явная инициализация, без auto-detect
```

### CoinGecko OHLC → интервалы свечей
| days | Интервал |
|------|----------|
| 1 | 30m |
| 2 | 1h |
| 7 | 4h |
| 30 | 1d |

### ADMIN_PASSWORD
Хранится в `.env` как bcrypt-хеш. Задаётся через GitHub Secret, прописывается при каждом деплое.

---

## 7. Инфраструктура и секреты

| Переменная | Где | Назначение |
|------------|-----|------------|
| `DATABASE_URL` | VPS `.env` | PostgreSQL подключение |
| `SESSION_SECRET` | VPS `.env` + GitHub | Сессии пользователей |
| `WALLET_MNEMONIC` | VPS `.env` + GitHub | HD-кошелёк биржи (никогда не логировать) |
| `HOT_WALLET_PRIVATE_KEY` | VPS `.env` + GitHub | Горячий кошелёк |
| `ADMIN_PASSWORD` | GitHub → VPS `.env` | Bcrypt-хеш пароля администратора |
| `ETHERSCAN_API_KEY` | GitHub | Мониторинг on-chain |
| `VPS_HOST` | GitHub | 89.111.152.187 |
| `VPS_USER` | GitHub | root |
| `VPS_PASSWORD` | GitHub | SSH-пароль |

---

## 8. Ключевые URL и доступы

- **Продакшн:** https://hex.aliterra.space
- **Admin panel:** https://hex.aliterra.space/admin
- **API health:** https://hex.aliterra.space/api/health
- **GitHub Actions:** https://github.com/aliter230880/CEX/actions
- **VPS IP:** 89.111.152.187
- **PM2:** `nexex` (биржа ID=1), `aliterra` (доп. сервис ID=0)
