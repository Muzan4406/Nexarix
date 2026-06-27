import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Transaction = typeof transactionsTable.$inferSelect;
