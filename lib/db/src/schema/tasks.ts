import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetUrl: text("target_url").notNull(),
  points: integer("points").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  question: text("question"),
  correctAnswer: text("correct_answer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
