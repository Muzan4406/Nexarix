import { pgTable, serial, text, numeric, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userStatusEnum = pgEnum("user_status", ["inactive", "active", "banned"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  country: text("country").notNull(),
  passwordHash: text("password_hash").notNull(),
  status: userStatusEnum("status").notNull().default("inactive"),
  membership: text("membership").notNull().default("Free"),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  points: integer("points").notNull().default(0),
  upline: text("upline"),
  avatarUrl: text("avatar_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  welcomeBonus: numeric("welcome_bonus", { precision: 12, scale: 2 }).notNull().default("0"),
  totalWithdrawn: numeric("total_withdrawn", { precision: 12, scale: 2 }).notNull().default("0"),
  mlmEarningsL1: numeric("mlm_earnings_l1", { precision: 12, scale: 2 }).notNull().default("0"),
  mlmEarningsL2: numeric("mlm_earnings_l2", { precision: 12, scale: 2 }).notNull().default("0"),
  mlmEarningsL3: numeric("mlm_earnings_l3", { precision: 12, scale: 2 }).notNull().default("0"),
  taskEarnings: numeric("task_earnings", { precision: 12, scale: 2 }).notNull().default("0"),
  hasSpun: boolean("has_spun").notNull().default(false),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, joinedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
