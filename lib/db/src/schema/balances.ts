import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const balancesTable = pgTable("balances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  asset: text("asset").notNull(),
  available: numeric("available", { precision: 28, scale: 8 }).notNull().default("0"),
  locked: numeric("locked", { precision: 28, scale: 8 }).notNull().default("0"),
  network: text("network").notNull().default("ETH"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBalanceSchema = createInsertSchema(balancesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBalance = z.infer<typeof insertBalanceSchema>;
export type Balance = typeof balancesTable.$inferSelect;
