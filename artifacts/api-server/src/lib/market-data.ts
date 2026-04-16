import { db, klinesTable, tradingPairsTable, tradesTable } from "@workspace/db";
import { eq, desc, and, gte } from "drizzle-orm";
import { logger } from "./logger";
import { getRealPrice, getRealStats } from "./price-feed";

// Fallback prices (used only if Binance feed not yet loaded)
const FALLBACK_PRICES: Record<string, number> = {
  "BTC/USDT": 67000,
  "ETH/USDT": 3500,
  "BNB/USDT": 600,
  "POL/USDT": 0.90,
  "SOL/USDT": 165,
  "USDT/USD": 1.0,
};

export function getSeedPrice(pair: string): number {
  return getRealPrice(pair) ?? FALLBACK_PRICES[pair] ?? 1.0;
}

export async function generateKlines(pair: string, interval: string = "1h", count: number = 100): Promise<void> {
  const basePrice = getSeedPrice(pair);
  const now = Date.now();
  const intervalMs = getIntervalMs(interval);
  const startTime = now - count * intervalMs;

  const klines = [];
  let price = basePrice * 0.9; // start slightly lower

  for (let i = 0; i < count; i++) {
    const openTime = startTime + i * intervalMs;
    const closeTime = openTime + intervalMs - 1;

    const change = (Math.random() - 0.48) * 0.03; // slight upward bias
    const open = price;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = (Math.random() * 100 + 10) * (basePrice > 1000 ? 0.1 : 100);

    klines.push({
      pair,
      interval,
      openTime,
      closeTime,
      open: open.toFixed(8),
      high: high.toFixed(8),
      low: low.toFixed(8),
      close: close.toFixed(8),
      volume: volume.toFixed(4),
    });

    price = close;
  }

  await db.insert(klinesTable).values(klines).onConflictDoNothing();
}

export function getIntervalMs(interval: string): number {
  const map: Record<string, number> = {
    "1m": 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "30m": 30 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
  };
  return map[interval] ?? 60 * 60 * 1000;
}

export async function getTickerData(pair: string) {
  const intervalMs = 24 * 60 * 60 * 1000;
  const since24h = Date.now() - intervalMs;

  const klines = await db
    .select()
    .from(klinesTable)
    .where(and(eq(klinesTable.pair, pair), eq(klinesTable.interval, "1h"), gte(klinesTable.openTime, since24h)))
    .orderBy(desc(klinesTable.openTime));

  // If no recent klines — use real-time stats from CoinGecko
  if (klines.length === 0) {
    const stats = getRealStats(pair);
    const price = stats?.price ?? getSeedPrice(pair);
    return {
      pair,
      lastPrice: price.toFixed(8),
      priceChange: (stats?.change24h ?? 0).toFixed(8),
      priceChangePercent: (stats?.changePercent24h ?? 0).toFixed(2),
      highPrice: (stats?.high24h ?? price * 1.02).toFixed(8),
      lowPrice: (stats?.low24h ?? price * 0.98).toFixed(8),
      volume: (stats?.volume24h ?? 0).toFixed(4),
      quoteVolume: (stats?.volume24h ?? 0).toFixed(2),
      openPrice: (price - (stats?.change24h ?? 0)).toFixed(8),
      network: "ETH",
    };
  }

  const latest = klines[0]!;
  const oldest = klines[klines.length - 1]!;
  // Prefer real-time price over stale kline close
  const realStats = getRealStats(pair);
  const lastPrice = realStats?.price ?? parseFloat(latest.close);
  const openPrice = parseFloat(oldest.open);
  const priceChange = realStats?.change24h ?? (lastPrice - openPrice);
  const priceChangePercent = realStats?.changePercent24h ?? (openPrice !== 0 ? (priceChange / openPrice) * 100 : 0);
  const highPrice = realStats?.high24h ?? Math.max(...klines.map((k) => parseFloat(k.high)));
  const lowPrice = realStats?.low24h ?? Math.min(...klines.map((k) => parseFloat(k.low)));
  const volume = klines.reduce((sum, k) => sum + parseFloat(k.volume), 0);
  const quoteVolume = realStats?.volume24h ?? klines.reduce((sum, k) => sum + parseFloat(k.volume) * parseFloat(k.close), 0);

  return {
    pair,
    lastPrice: lastPrice.toFixed(8),
    priceChange: priceChange.toFixed(8),
    priceChangePercent: priceChangePercent.toFixed(2),
    highPrice: highPrice.toFixed(8),
    lowPrice: lowPrice.toFixed(8),
    volume: volume.toFixed(4),
    quoteVolume: quoteVolume.toFixed(2),
    openPrice: openPrice.toFixed(8),
    network: "ETH",
  };
}

export async function getOrderBookData(pair: string, depth: number = 20) {
  // Generate simulated order book around current price
  const price = getSeedPrice(pair);

  const bids: string[][] = [];
  const asks: string[][] = [];

  for (let i = 1; i <= depth; i++) {
    const bidPrice = (price * (1 - i * 0.0005)).toFixed(2);
    const askPrice = (price * (1 + i * 0.0005)).toFixed(2);
    const bidQty = (Math.random() * 5 + 0.01).toFixed(4);
    const askQty = (Math.random() * 5 + 0.01).toFixed(4);

    bids.push([bidPrice, bidQty, (parseFloat(bidPrice) * parseFloat(bidQty)).toFixed(2)]);
    asks.push([askPrice, askQty, (parseFloat(askPrice) * parseFloat(askQty)).toFixed(2)]);
  }

  return {
    pair,
    bids,
    asks,
    lastUpdate: new Date(),
  };
}
