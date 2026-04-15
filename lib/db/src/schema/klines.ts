import { pgTable, text, serial, timestamp, bigint, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const klinesTable = pgTable("klines", {
  id: serial("id").primaryKey(),
  pair: text("pair").notNull(),
  interval: text("interval").notNull().default("1h"),
  openTime: bigint("open_time", { mode: "number" }).notNull(),
  closeTime: bigint("close_time", { mode: "number" }).notNull(),
  open: numeric("open", { precision: 28, scale: 8 }).notNull(),
  high: numeric("high", { precision: 28, scale: 8 }).notNull(),
  low: numeric("low", { precision: 28, scale: 8 }).notNull(),
  close: numeric("close", { precision: 28, scale: 8 }).notNull(),
  volume: numeric("volume", { precision: 28, scale: 8 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKlineSchema = createInsertSchema(klinesTable).omit({ id: true, createdAt: true });
export type InsertKline = z.infer<typeof insertKlineSchema>;
export type Kline = typeof klinesTable.$inferSelect;
