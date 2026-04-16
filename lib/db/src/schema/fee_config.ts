import { pgTable, text, serial, timestamp, numeric, boolean } from "drizzle-orm/pg-core";

export const feeConfigTable = pgTable("fee_config", {
  id: serial("id").primaryKey(),
  asset: text("asset").notNull().unique(),
  makerFee: numeric("maker_fee", { precision: 10, scale: 6 }).notNull().default("0.001"),
  takerFee: numeric("taker_fee", { precision: 10, scale: 6 }).notNull().default("0.001"),
  withdrawalFee: numeric("withdrawal_fee", { precision: 28, scale: 8 }).notNull().default("0"),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FeeConfig = typeof feeConfigTable.$inferSelect;
