import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { tasksTable } from "./tasks";

export const taskCompletionsTable = pgTable("task_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  taskId: integer("task_id").notNull().references(() => tasksTable.id),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export type TaskCompletion = typeof taskCompletionsTable.$inferSelect;
