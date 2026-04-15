import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const adminAuditLogTable = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(), // 'freeze' | 'unfreeze' | 'balance_adjustment' | 'escrow_key_reveal' | 'sweep'
  targetUserId: integer("target_user_id").references(() => usersTable.id),
  details: jsonb("details"), // { asset, amount, reason, txHash, ... }
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminAuditLog = typeof adminAuditLogTable.$inferSelect;
