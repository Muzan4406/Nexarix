import { pgTable, serial, text, numeric, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const storeItemsTable = pgTable("store_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("app"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  isFree: boolean("is_free").notNull().default(false),
  thumbnailUrl: text("thumbnail_url"),
  downloadUrl: text("download_url"),
  fileType: text("file_type").notNull().default("apk"),
  version: text("version"),
  fileSize: text("file_size"),
  isActive: boolean("is_active").notNull().default(true),
  isPremium: boolean("is_premium").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type StoreItem = typeof storeItemsTable.$inferSelect;
