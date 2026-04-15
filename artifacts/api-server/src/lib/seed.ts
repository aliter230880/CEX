import { db, tradingPairsTable, klinesTable } from "@workspace/db";
import { generateKlines } from "./market-data";
import { logger } from "./logger";

const PAIRS = [
  { symbol: "BTC/USDT", baseAsset: "BTC", quoteAsset: "USDT", network: "ETH", tickSize: "0.01", stepSize: "0.00001", minOrderSize: "0.00001" },
  { symbol: "ETH/USDT", baseAsset: "ETH", quoteAsset: "USDT", network: "ETH", tickSize: "0.01", stepSize: "0.0001", minOrderSize: "0.0001" },
  { symbol: "BNB/USDT", baseAsset: "BNB", quoteAsset: "USDT", network: "BNB", tickSize: "0.01", stepSize: "0.001", minOrderSize: "0.001" },
  { symbol: "POL/USDT", baseAsset: "POL", quoteAsset: "USDT", network: "POL", tickSize: "0.0001", stepSize: "1", minOrderSize: "1" },
  { symbol: "SOL/USDT", baseAsset: "SOL", quoteAsset: "USDT", network: "ETH", tickSize: "0.01", stepSize: "0.01", minOrderSize: "0.01" },
];

export async function seedData(): Promise<void> {
  try {
    // Insert trading pairs if not exist
    for (const pair of PAIRS) {
      await db
        .insert(tradingPairsTable)
        .values({ ...pair, status: "active" })
        .onConflictDoNothing();
    }

    // Generate klines for each pair if not exist
    const existingKlines = await db.select().from(klinesTable).limit(1);
    if (existingKlines.length === 0) {
      logger.info("Seeding market kline data...");
      for (const pair of PAIRS) {
        await generateKlines(pair.symbol, "1h", 200);
        await generateKlines(pair.symbol, "1d", 90);
        await generateKlines(pair.symbol, "15m", 200);
        await generateKlines(pair.symbol, "5m", 200);
        await generateKlines(pair.symbol, "1m", 200);
      }
      logger.info("Kline data seeded");
    }

    logger.info("Seed completed");
  } catch (err) {
    logger.error({ err }, "Seed error");
  }
}
