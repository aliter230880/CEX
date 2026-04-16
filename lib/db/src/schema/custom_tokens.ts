import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const customTokensTable = pgTable("custom_tokens", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  network: text("network").notNull(),
  contractAddress: text("contract_address").notNull(),
  decimals: integer("decimals").notNull().default(18),
  status: text("status").notNull().default("active"),
  iconUrl: text("icon_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CustomToken = typeof customTokensTable.$inferSelect;
