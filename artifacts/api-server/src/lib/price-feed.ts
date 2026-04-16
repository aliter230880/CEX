import { db, klinesTable, tradingPairsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

// Map our pairs to CoinGecko coin IDs
const COINGECKO_IDS: Record<string, string> = {
  "BTC/USDT": "bitcoin",
  "ETH/USDT": "ethereum",
  "BNB/USDT": "binancecoin",
  "POL/USDT": "matic-network",
  "SOL/USDT": "solana",
};

// In-memory cache of real prices and 24h stats
interface PriceStats {
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

const PRICE_CACHE: Record<string, PriceStats> = {};

export function getRealPrice(pair: string): number | null {
  return PRICE_CACHE[pair]?.price ?? null;
}

export function getRealStats(pair: string): PriceStats | null {
  return PRICE_CACHE[pair] ?? null;
}

async function fetchCoinGeckoMarkets(): Promise<void> {
  const ids = Object.values(COINGECKO_IDS).join(",");
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=10&sparkline=false&price_change_percentage=24h`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`CoinGecko markets error: ${res.status}`);

  const data = await res.json() as Array<{
    id: string;
    current_price: number;
    price_change_24h: number;
    price_change_percentage_24h: number;
    high_24h: number;
    low_24h: number;
    total_volume: number;
  }>;

  // Build reverse map: coingecko id → pair
  const idToPair: Record<string, string> = {};
  for (const [pair, id] of Object.entries(COINGECKO_IDS)) {
    idToPair[id] = pair;
  }

  for (const coin of data) {
    const pair = idToPair[coin.id];
    if (!pair) continue;
    PRICE_CACHE[pair] = {
      price: coin.current_price,
      change24h: coin.price_change_24h ?? 0,
      changePercent24h: coin.price_change_percentage_24h ?? 0,
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      volume24h: coin.total_volume,
    };
  }

  logger.debug({ prices: Object.fromEntries(Object.entries(PRICE_CACHE).map(([k, v]) => [k, v.price])) }, "Price cache updated from CoinGecko");
}

async function fetchCoinGeckoOhlc(coinId: string, days: number): Promise<Array<{
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
}>> {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`CoinGecko OHLC error: ${res.status} for ${coinId}`);
  const raw = await res.json() as Array<[number, number, number, number, number]>;

  // CoinGecko returns [timestamp_ms, open, high, low, close]
  return raw.map((c, i) => ({
    openTime: c[0],
    closeTime: raw[i + 1]?.[0] ?? c[0] + 3600_000,
    open: c[1],
    high: c[2],
    low: c[3],
    close: c[4],
  }));
}

// CoinGecko OHLC days → our interval mapping
// days=1 → ~30min candles (when granularity is 30m), days=7 → ~4h, days=30 → daily
const SYNC_PLAN: Array<{ days: number; interval: string }> = [
  { days: 1, interval: "30m" },
  { days: 2, interval: "1h" },
  { days: 7, interval: "4h" },
  { days: 30, interval: "1d" },
];

async function syncKlinesForPair(pair: string, coinId: string): Promise<void> {
  for (const { days, interval } of SYNC_PLAN) {
    try {
      const candles = await fetchCoinGeckoOhlc(coinId, days);
      if (!candles.length) continue;

      // Estimate interval duration
      const intervalMs = candles.length > 1
        ? candles[1]!.openTime - candles[0]!.openTime
        : 3600_000;

      const rows = candles.map(c => ({
        pair,
        interval,
        openTime: c.openTime,
        closeTime: c.openTime + intervalMs - 1,
        open: c.open.toFixed(8),
        high: c.high.toFixed(8),
        low: c.low.toFixed(8),
        close: c.close.toFixed(8),
        volume: "0", // CoinGecko OHLC doesn't include volume in free tier
      }));

      for (const row of rows) {
        await db.insert(klinesTable).values(row).onConflictDoNothing();
      }

      // Update latest candle's close (it's the current live candle)
      const latest = candles[candles.length - 1]!;
      await db
        .update(klinesTable)
        .set({
          high: latest.high.toFixed(8),
          low: latest.low.toFixed(8),
          close: latest.close.toFixed(8),
        })
        .where(
          and(
            eq(klinesTable.pair, pair),
            eq(klinesTable.interval, interval),
            eq(klinesTable.openTime, latest.openTime),
          ),
        );

      // Small delay to respect rate limits
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      logger.warn({ pair, interval, err }, "CoinGecko klines sync failed");
    }
  }
}

async function updateLatestCandleForInterval(pair: string, coinId: string, days: number, interval: string): Promise<void> {
  const candles = await fetchCoinGeckoOhlc(coinId, days);
  if (!candles.length) return;

  const latest = candles[candles.length - 1]!;
  const intervalMs = candles.length > 1
    ? candles[1]!.openTime - candles[0]!.openTime
    : (interval === "30m" ? 1800_000 : 3600_000);

  await db
    .insert(klinesTable)
    .values({
      pair,
      interval,
      openTime: latest.openTime,
      closeTime: latest.openTime + intervalMs - 1,
      open: latest.open.toFixed(8),
      high: latest.high.toFixed(8),
      low: latest.low.toFixed(8),
      close: latest.close.toFixed(8),
      volume: "0",
    })
    .onConflictDoNothing();

  await db
    .update(klinesTable)
    .set({
      high: latest.high.toFixed(8),
      low: latest.low.toFixed(8),
      close: latest.close.toFixed(8),
    })
    .where(
      and(
        eq(klinesTable.pair, pair),
        eq(klinesTable.interval, interval),
        eq(klinesTable.openTime, latest.openTime),
      ),
    );
}

async function updateLatestCandles(): Promise<void> {
  for (const [pair, coinId] of Object.entries(COINGECKO_IDS)) {
    try {
      await updateLatestCandleForInterval(pair, coinId, 1, "30m");
      await new Promise(r => setTimeout(r, 1200));
      await updateLatestCandleForInterval(pair, coinId, 2, "1h");
      await new Promise(r => setTimeout(r, 1200));
    } catch (err) {
      logger.warn({ pair, err }, "Failed to update latest candles");
    }
  }
}

// ---------------------------------------------------------------------------
// Pub/sub for SSE clients
// ---------------------------------------------------------------------------

type PriceUpdateListener = (snapshot: Record<string, PriceStats>) => void;

const priceListeners = new Set<PriceUpdateListener>();

export function subscribeToPriceUpdates(listener: PriceUpdateListener): () => void {
  priceListeners.add(listener);
  return () => {
    priceListeners.delete(listener);
  };
}

function notifyPriceListeners(): void {
  if (priceListeners.size === 0) return;
  const snapshot = { ...PRICE_CACHE };
  for (const listener of priceListeners) {
    try {
      listener(snapshot);
    } catch {
      // ignore individual listener errors
    }
  }
}

let feedInterval: NodeJS.Timeout | null = null;

export async function startPriceFeed(): Promise<void> {
  logger.info("Starting price feed from CoinGecko...");

  // Load prices immediately
  try {
    await fetchCoinGeckoMarkets();
    notifyPriceListeners();
    logger.info({ prices: Object.fromEntries(Object.entries(PRICE_CACHE).map(([k, v]) => [k, v.price])) }, "CoinGecko prices loaded");
  } catch (err) {
    logger.warn({ err }, "Initial CoinGecko price fetch failed");
  }

  // Sync klines in background (runs once, takes a while due to rate limits)
  const pairs = await db.select().from(tradingPairsTable);
  (async () => {
    for (const p of pairs) {
      const coinId = COINGECKO_IDS[p.symbol];
      if (!coinId) continue;
      await syncKlinesForPair(p.symbol, coinId);
      logger.info({ pair: p.symbol }, "Initial klines sync complete");
    }
  })().catch(err => logger.warn({ err }, "Background klines sync error"));

  // Poll every 60 seconds: update prices + latest candles
  feedInterval = setInterval(async () => {
    try {
      await fetchCoinGeckoMarkets();
      notifyPriceListeners();
    } catch (err) {
      logger.warn({ err }, "CoinGecko price update failed");
    }
    await updateLatestCandles();
  }, 60_000);

  logger.info("Price feed running — updating every 60s from CoinGecko");
}

export function stopPriceFeed(): void {
  if (feedInterval) {
    clearInterval(feedInterval);
    feedInterval = null;
  }
}
