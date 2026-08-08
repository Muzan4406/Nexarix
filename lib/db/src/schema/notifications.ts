import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => usersTable.id),
});

export const notificationReadsTable = pgTable("notification_reads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  notificationId: integer("notification_id").notNull().references(() => notificationsTable.id),
  readAt: timestamp("read_at").notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
export type NotificationRead = typeof notificationReadsTable.$inferSelect;
