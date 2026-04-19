import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  pair: text("pair").notNull(),
  side: text("side").notNull(), // buy | sell
  type: text("type").notNull(), // limit | market
  status: text("status").notNull().default("open"), // open | filled | cancelled | partial
  price: numeric("price", { precision: 28, scale: 8 }),
  quantity: numeric("quantity", { precision: 28, scale: 8 }).notNull(),
  filled: numeric("filled", { precision: 28, scale: 8 }).notNull().default("0"),
  total: numeric("total", { precision: 28, scale: 8 }).notNull().default("0"),
  isBot: boolean("is_bot").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
