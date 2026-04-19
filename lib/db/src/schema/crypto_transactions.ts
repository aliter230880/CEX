import { pgTable, text, serial, timestamp, integer, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const cryptoTransactionsTable = pgTable("crypto_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: text("type").notNull(), // 'deposit' | 'withdrawal'
  asset: text("asset").notNull(),
  network: text("network").notNull(),
  amount: numeric("amount", { precision: 28, scale: 8 }).notNull(),
  txHash: text("tx_hash"),
  status: text("status").notNull().default("pending"), // 'pending' | 'confirmed' | 'failed'
  fromAddress: text("from_address"),
  toAddress: text("to_address"),
  confirmations: integer("confirmations").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("crypto_transactions_tx_hash_unique")
    .on(table.txHash)
    .where(sql`${table.txHash} IS NOT NULL`),
]);

export type CryptoTransaction = typeof cryptoTransactionsTable.$inferSelect;
