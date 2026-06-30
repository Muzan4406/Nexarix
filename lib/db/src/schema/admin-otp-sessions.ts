import { pgTable, text, integer, bigint } from "drizzle-orm/pg-core";

export const adminOtpSessionsTable = pgTable("admin_otp_sessions", {
  sessionToken: text("session_token").primaryKey(),
  otp: text("otp").notNull(),
  userId: integer("user_id").notNull(),
  isAdmin: integer("is_admin").notNull().default(1),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
});
