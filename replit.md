# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### CEX Exchange (`artifacts/cex-exchange`)
- React + Vite frontend for a cryptocurrency spot trading exchange
- Preview path: `/` (root)
- Pages: Markets Overview (`/`), Trade (`/trade/:pair`), Wallet (`/wallet`), Orders (`/orders`), Login/Register

### API Server (`artifacts/api-server`)
- Express 5 backend API
- Session-based auth (express-session + bcryptjs)
- Routes: /api/auth, /api/balances, /api/orders, /api/trades, /api/orderbook, /api/market

## CEX Exchange Features

- **Spot Trading**: Limit and market orders for BTC/USDT, ETH/USDT, BNB/USDT, POL/USDT, SOL/USDT
- **Order Book**: Real-time bids/asks with depth display
- **Price Chart**: Area chart with kline/candlestick data (recharts)
- **Matching Engine**: Simple order matching with balance locking/unlocking
- **User Balances**: Multi-asset balances (USDT, BTC, ETH, BNB, POL)
- **Deposit/Withdraw**: Simulated deposits and withdrawals supporting ETH, BNB, POL networks
- **Trade History**: User trade history with fees
- **Market Data**: Tickers, klines (1m/5m/15m/1h/4h/1d), recent trades, market summary

## Database Schema

- `users` - User accounts with hashed passwords
- `balances` - Per-user per-asset balances (available + locked)
- `orders` - Spot orders (limit/market, buy/sell)
- `trades` - Executed trades with fees
- `trading_pairs` - Available trading pairs (BTC/USDT, ETH/USDT, etc.)
- `klines` - OHLCV candlestick data

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Important Notes

- API pair format: use `-` separator in URL paths (e.g. `BTC-USDT`), backend converts to `/` internally
- Frontend pair format: uses `_` in URL routes (e.g. `/trade/BTC_USDT`), converts to `/` for display
- Trading fee: 0.1% per trade
- Starter balances on registration: 10,000 USDT, 0.5 BTC, 5 ETH, 10 BNB, 1000 POL

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
