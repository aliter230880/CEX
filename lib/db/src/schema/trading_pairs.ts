import { pgTable, text, serial, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradingPairsTable = pgTable("trading_pairs", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  baseAsset: text("base_asset").notNull(),
  quoteAsset: text("quote_asset").notNull(),
  status: text("status").notNull().default("active"),
  minOrderSize: numeric("min_order_size", { precision: 28, scale: 8 }).notNull().default("0.00001"),
  tickSize: numeric("tick_size", { precision: 28, scale: 8 }).notNull().default("0.01"),
  stepSize: numeric("step_size", { precision: 28, scale: 8 }).notNull().default("0.00001"),
  network: text("network").notNull().default("ETH"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTradingPairSchema = createInsertSchema(tradingPairsTable).omit({ id: true, createdAt: true });
export type InsertTradingPair = z.infer<typeof insertTradingPairSchema>;
export type TradingPair = typeof tradingPairsTable.$inferSelect;
