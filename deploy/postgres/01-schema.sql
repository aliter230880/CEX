-- NexEx — initial database schema
-- This script runs automatically when PostgreSQL starts for the first time

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  username        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  account_status  TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS balances (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  asset       TEXT NOT NULL,
  available   NUMERIC NOT NULL DEFAULT 0,
  locked      NUMERIC NOT NULL DEFAULT 0,
  network     TEXT NOT NULL DEFAULT 'ETH',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trading_pairs (
  id             SERIAL PRIMARY KEY,
  symbol         TEXT NOT NULL UNIQUE,
  base_asset     TEXT NOT NULL,
  quote_asset    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active',
  min_order_size NUMERIC NOT NULL DEFAULT 0.00001,
  tick_size      NUMERIC NOT NULL DEFAULT 0.01,
  step_size      NUMERIC NOT NULL DEFAULT 0.00001,
  network        TEXT NOT NULL DEFAULT 'ETH',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  pair        TEXT NOT NULL,
  side        TEXT NOT NULL,
  type        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',
  price       NUMERIC,
  quantity    NUMERIC NOT NULL,
  filled      NUMERIC NOT NULL DEFAULT 0,
  total       NUMERIC NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trades (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  order_id    INTEGER NOT NULL REFERENCES orders(id),
  pair        TEXT NOT NULL,
  side        TEXT NOT NULL,
  price       NUMERIC NOT NULL,
  quantity    NUMERIC NOT NULL,
  total       NUMERIC NOT NULL,
  fee         NUMERIC NOT NULL DEFAULT 0,
  fee_asset   TEXT NOT NULL DEFAULT 'USDT',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS klines (
  id          SERIAL PRIMARY KEY,
  pair        TEXT NOT NULL,
  interval    TEXT NOT NULL DEFAULT '1h',
  open_time   BIGINT NOT NULL,
  close_time  BIGINT NOT NULL,
  open        NUMERIC NOT NULL,
  high        NUMERIC NOT NULL,
  low         NUMERIC NOT NULL,
  close       NUMERIC NOT NULL,
  volume      NUMERIC NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deposit_addresses (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  address          TEXT NOT NULL,
  derivation_index INTEGER NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crypto_transactions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  type          TEXT NOT NULL,
  asset         TEXT NOT NULL,
  network       TEXT NOT NULL,
  amount        NUMERIC NOT NULL,
  tx_hash       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  from_address  TEXT,
  to_address    TEXT,
  confirmations INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id             SERIAL PRIMARY KEY,
  action         TEXT NOT NULL,
  target_user_id INTEGER REFERENCES users(id),
  details        JSONB,
  reason         TEXT,
  admin_id       TEXT NOT NULL DEFAULT 'admin',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
