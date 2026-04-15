import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const depositAddressesTable = pgTable("deposit_addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  address: text("address").notNull(),
  derivationIndex: integer("derivation_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DepositAddress = typeof depositAddressesTable.$inferSelect;
