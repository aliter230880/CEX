import { pgTable, serial, timestamp, numeric, boolean, text } from "drizzle-orm/pg-core";

export const referralConfigTable = pgTable("referral_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  rewardType: text("reward_type").notNull().default("percentage"),
  rewardValue: numeric("reward_value", { precision: 10, scale: 4 }).notNull().default("10"),
  minTradeVolume: numeric("min_trade_volume", { precision: 28, scale: 8 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReferralConfig = typeof referralConfigTable.$inferSelect;
