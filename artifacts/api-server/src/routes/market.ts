import { Router } from "express";
import { eq, desc, and, gte } from "drizzle-orm";
import { db, tradingPairsTable, klinesTable, tradesTable } from "@workspace/db";
import { getTickerData, getOrderBookData, getSeedPrice } from "../lib/market-data";
import { subscribeToPriceUpdates } from "../lib/price-feed";
import { logger } from "../lib/logger";

const router = Router();

router.get("/market/pairs", async (_req, res): Promise<void> => {
  const pairs = await db.select().from(tradingPairsTable).where(eq(tradingPairsTable.status, "active"));
  res.json(
    pairs.map((p) => ({
      id: p.id,
      symbol: p.symbol,
      baseAsset: p.baseAsset,
      quoteAsset: p.quoteAsset,
      status: p.status,
      minOrderSize: p.minOrderSize,
      tickSize: p.tickSize,
      stepSize: p.stepSize,
      network: p.network,
    })),
  );
});

router.get("/market/ticker/:pair", async (req, res): Promise<void> => {
  const rawPair = Array.isArray(req.params.pair) ? req.params.pair[0] : req.params.pair;
  const pair = (rawPair ?? "").replace(/[-_]/g, "/");
  const ticker = await getTickerData(pair);
  res.json(ticker);
});

router.get("/market/tickers", async (_req, res): Promise<void> => {
  const pairs = await db.select().from(tradingPairsTable).where(eq(tradingPairsTable.status, "active"));
  const tickers = await Promise.all(pairs.map((p) => getTickerData(p.symbol)));
  res.json(tickers);
});

router.get("/market/klines/:pair", async (req, res): Promise<void> => {
  const rawPair = Array.isArray(req.params.pair) ? req.params.pair[0] : req.params.pair;
  const pair = (rawPair ?? "").replace(/[-_]/g, "/");
  const interval = (req.query.interval as string) ?? "1h";
  const limit = parseInt((req.query.limit as string) ?? "100", 10) || 100;

  const klines = await db
    .select()
    .from(klinesTable)
    .where(and(eq(klinesTable.pair, pair), eq(klinesTable.interval, interval)))
    .orderBy(desc(klinesTable.openTime))
    .limit(limit);

  res.json(
    klines
      .reverse()
      .map((k) => ({
        openTime: k.openTime,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume,
        closeTime: k.closeTime,
      })),
  );
});

router.get("/market/recent-trades/:pair", async (req, res): Promise<void> => {
  const rawPair = Array.isArray(req.params.pair) ? req.params.pair[0] : req.params.pair;
  const pair = (rawPair ?? "").replace(/[-_]/g, "/");
  const limit = parseInt((req.query.limit as string) ?? "30", 10) || 30;

  const trades = await db
    .select()
    .from(tradesTable)
    .where(eq(tradesTable.pair, pair))
    .orderBy(desc(tradesTable.createdAt))
    .limit(limit);

  res.json(
    trades.map((t) => ({
      id: t.id,
      pair: t.pair,
      side: t.side,
      price: t.price,
      quantity: t.quantity,
      createdAt: t.createdAt,
    })),
  );
});

router.get("/market/summary", async (_req, res): Promise<void> => {
  const pairs = await db.select().from(tradingPairsTable).where(eq(tradingPairsTable.status, "active"));
  const tickers = await Promise.all(pairs.map((p) => getTickerData(p.symbol)));

  const since24h = Date.now() - 24 * 60 * 60 * 1000;
  const recentTrades = await db
    .select()
    .from(tradesTable)
    .where(gte(tradesTable.createdAt, new Date(since24h)));

  const totalVolume = tickers.reduce((sum, t) => sum + parseFloat(t.quoteVolume), 0);
  const sorted = [...tickers].sort(
    (a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent),
  );

  res.json({
    totalVolume24h: totalVolume.toFixed(2),
    activePairs: pairs.length,
    totalTrades24h: recentTrades.length,
    topGainer: sorted[0] ?? null,
    topLoser: sorted[sorted.length - 1] ?? null,
  });
});

router.get("/market/stream", async (req, res): Promise<void> => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const pairs = await db
    .select()
    .from(tradingPairsTable)
    .where(eq(tradingPairsTable.status, "active"));

  const sendTickers = async () => {
    try {
      const tickers = await Promise.all(pairs.map((p) => getTickerData(p.symbol)));
      res.write(`data: ${JSON.stringify({ type: "tickers", payload: tickers })}\n\n`);
    } catch (err) {
      logger.warn({ err }, "SSE ticker broadcast failed");
    }
  };

  await sendTickers();

  const unsubscribe = subscribeToPriceUpdates(() => {
    sendTickers().catch(() => {});
  });

  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      // client disconnected
    }
  }, 25_000);

  req.on("close", () => {
    unsubscribe();
    clearInterval(heartbeat);
  });
});

export default router;
