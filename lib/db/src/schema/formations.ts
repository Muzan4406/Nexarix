import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const formationsTable = pgTable("formations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  thumbnailUrl: text("thumbnail_url"),
  videoUrl: text("video_url"),
  contentUrl: text("content_url"),
  duration: text("duration"),
  level: text("level").notNull().default("debutant"),
  isFree: boolean("is_free").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Formation = typeof formationsTable.$inferSelect;
