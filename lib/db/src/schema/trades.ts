import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  pair: text("pair").notNull(),
  side: text("side").notNull(), // buy | sell
  price: numeric("price", { precision: 28, scale: 8 }).notNull(),
  quantity: numeric("quantity", { precision: 28, scale: 8 }).notNull(),
  total: numeric("total", { precision: 28, scale: 8 }).notNull(),
  fee: numeric("fee", { precision: 28, scale: 8 }).notNull().default("0"),
  feeAsset: text("fee_asset").notNull().default("USDT"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ id: true, createdAt: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
