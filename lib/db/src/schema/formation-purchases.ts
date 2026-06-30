import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const formationPurchasesTable = pgTable("formation_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  formationId: integer("formation_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("pending"),
  sendavapayReference: text("sendavapay_reference"),
  paymentToken: text("payment_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type FormationPurchase = typeof formationPurchasesTable.$inferSelect;
