import { db, klinesTable, tradingPairsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

// Map our pairs to Binance symbols
const BINANCE_MAP: Record<string, string> = {
  "BTC/USDT": "BTCUSDT",
  "ETH/USDT": "ETHUSDT",
  "BNB/USDT": "BNBUSDT",
  "POL/USDT": "POLUSDT",
  "SOL/USDT": "SOLUSDT",
};

// In-memory cache of latest real prices
const REAL_PRICES: Record<string, number> = {};

export function getRealPrice(pair: string): number | null {
  return REAL_PRICES[pair] ?? null;
}

async function fetchBinanceTicker24h(symbols: string[]): Promise<Record<string, {
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  openPrice: number;
}>> {
  const symbolsParam = encodeURIComponent(JSON.stringify(symbols));
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Binance 24hr ticker error: ${res.status}`);
  const data = await res.json() as Array<{
    symbol: string;
    lastPrice: string;
    priceChange: string;
    priceChangePercent: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
    quoteVolume: string;
    openPrice: string;
  }>;

  const result: Record<string, ReturnType<typeof fetchBinanceTicker24h> extends Promise<infer T> ? T[string] : never> = {};
  for (const t of data) {
    result[t.symbol] = {
      lastPrice: parseFloat(t.lastPrice),
      priceChange: parseFloat(t.priceChange),
      priceChangePercent: parseFloat(t.priceChangePercent),
      highPrice: parseFloat(t.highPrice),
      lowPrice: parseFloat(t.lowPrice),
      volume: parseFloat(t.volume),
      quoteVolume: parseFloat(t.quoteVolume),
      openPrice: parseFloat(t.openPrice),
    };
  }
  return result;
}

async function fetchBinanceKlines(
  symbol: string,
  interval: string,
  limit: number = 100,
): Promise<Array<{
  openTime: number;
  closeTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}>> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Binance klines error: ${res.status}`);
  const data = await res.json() as Array<[number, string, string, string, string, string, number]>;
  return data.map(k => ({
    openTime: k[0],
    closeTime: k[6],
    open: k[1],
    high: k[2],
    low: k[3],
    close: k[4],
    volume: k[5],
  }));
}

const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"];

async function syncKlinesForPair(pair: string, binanceSymbol: string): Promise<void> {
  for (const interval of INTERVALS) {
    try {
      const limit = interval === "1m" ? 200 : 100;
      const klines = await fetchBinanceKlines(binanceSymbol, interval, limit);

      if (klines.length === 0) continue;

      const rows = klines.map(k => ({
        pair,
        interval,
        openTime: k.openTime,
        closeTime: k.closeTime,
        open: parseFloat(k.open).toFixed(8),
        high: parseFloat(k.high).toFixed(8),
        low: parseFloat(k.low).toFixed(8),
        close: parseFloat(k.close).toFixed(8),
        volume: parseFloat(k.volume).toFixed(4),
      }));

      // Upsert: insert, on conflict update OHLCV
      for (const row of rows) {
        await db
          .insert(klinesTable)
          .values(row)
          .onConflictDoNothing();
      }

      // Update the latest candle (may have changed)
      const latest = klines[klines.length - 1];
      if (latest) {
        await db
          .update(klinesTable)
          .set({
            high: parseFloat(latest.high).toFixed(8),
            low: parseFloat(latest.low).toFixed(8),
            close: parseFloat(latest.close).toFixed(8),
            volume: parseFloat(latest.volume).toFixed(4),
          })
          .where(
            and(
              eq(klinesTable.pair, pair),
              eq(klinesTable.interval, interval),
              eq(klinesTable.openTime, latest.openTime),
            ),
          );
      }
    } catch (err) {
      logger.warn({ pair, interval, err }, "Failed to sync klines interval");
    }
  }
}

async function updatePriceCache(): Promise<void> {
  const symbols = Object.values(BINANCE_MAP);
  try {
    const tickers = await fetchBinanceTicker24h(symbols);
    for (const [pair, binanceSymbol] of Object.entries(BINANCE_MAP)) {
      const t = tickers[binanceSymbol];
      if (t) {
        REAL_PRICES[pair] = t.lastPrice;
      }
    }
    logger.debug({ prices: REAL_PRICES }, "Updated real price cache");
  } catch (err) {
    logger.warn({ err }, "Failed to update price cache from Binance");
  }
}

let feedInterval: NodeJS.Timeout | null = null;

export async function startPriceFeed(): Promise<void> {
  logger.info("Starting real-time price feed from Binance...");

  // Initial sync
  try {
    await updatePriceCache();
    logger.info({ prices: REAL_PRICES }, "Initial price cache loaded");
  } catch (err) {
    logger.warn({ err }, "Initial price cache failed, will retry");
  }

  // Sync klines for all pairs on startup (runs in background)
  const pairs = await db.select().from(tradingPairsTable);
  for (const p of pairs) {
    const binanceSymbol = BINANCE_MAP[p.symbol];
    if (!binanceSymbol) continue;
    syncKlinesForPair(p.symbol, binanceSymbol)
      .then(() => logger.info({ pair: p.symbol }, "Klines synced"))
      .catch(err => logger.warn({ pair: p.symbol, err }, "Klines sync failed"));
  }

  // Poll every 60 seconds: update prices + latest kline
  feedInterval = setInterval(async () => {
    await updatePriceCache();

    // Update latest 1m and 1h candles for each pair
    for (const [pair, binanceSymbol] of Object.entries(BINANCE_MAP)) {
      for (const interval of ["1m", "1h"]) {
        try {
          const klines = await fetchBinanceKlines(binanceSymbol, interval, 2);
          if (!klines.length) continue;
          const latest = klines[klines.length - 1]!;
          // Try insert first, then update close/high/low
          await db
            .insert(klinesTable)
            .values({
              pair,
              interval,
              openTime: latest.openTime,
              closeTime: latest.closeTime,
              open: parseFloat(latest.open).toFixed(8),
              high: parseFloat(latest.high).toFixed(8),
              low: parseFloat(latest.low).toFixed(8),
              close: parseFloat(latest.close).toFixed(8),
              volume: parseFloat(latest.volume).toFixed(4),
            })
            .onConflictDoNothing();

          await db
            .update(klinesTable)
            .set({
              high: parseFloat(latest.high).toFixed(8),
              low: parseFloat(latest.low).toFixed(8),
              close: parseFloat(latest.close).toFixed(8),
              volume: parseFloat(latest.volume).toFixed(4),
            })
            .where(
              and(
                eq(klinesTable.pair, pair),
                eq(klinesTable.interval, interval),
                eq(klinesTable.openTime, latest.openTime),
              ),
            );
        } catch {
          // silent — will retry next interval
        }
      }
    }
  }, 60_000);

  logger.info("Price feed started — updating every 60 seconds");
}

export function stopPriceFeed(): void {
  if (feedInterval) {
    clearInterval(feedInterval);
    feedInterval = null;
  }
}
