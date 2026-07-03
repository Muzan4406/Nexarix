import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const blockedIpsTable = pgTable("blocked_ips", {
  ip: text("ip").primaryKey(),
  reason: text("reason").notNull(),
  country: text("country"),
  type: text("type"),
  path: text("path"),
  blockedAt: timestamp("blocked_at").notNull().defaultNow(),
  manual: boolean("manual").notNull().default(false),
});
