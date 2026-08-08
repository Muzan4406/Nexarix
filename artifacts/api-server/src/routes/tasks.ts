import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, taskCompletionsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

// FCFA credit per task point (0.5 FCFA per point)
const TASK_FCFA_RATE = 1; // 1 F affiché = 1 F crédité

router.get("/tasks", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;

  const activeTasks = await db.select().from(tasksTable)
    .where(and(eq(tasksTable.isActive, true), sql`${tasksTable.deletedAt} IS NULL`));

  const completions = await db.select({ taskId: taskCompletionsTable.taskId })
    .from(taskCompletionsTable)
    .where(eq(taskCompletionsTable.userId, userId));

  const completedTaskIds = new Set(completions.map(c => c.taskId));

  const tasksWithCompletion = activeTasks.map(task => ({
    id: task.id,
    category: task.category,
    title: task.title,
    description: task.description,
    targetUrl: task.targetUrl,
    points: task.points,
    isActive: task.isActive,
    question: task.question,
    correctAnswer: null,
    completedAt: completedTaskIds.has(task.id) ? new Date().toISOString() : null,
    createdAt: task.createdAt.toISOString(),
  }));

  res.json({
    tasks: tasksWithCompletion,
    totalCompleted: completions.length,
  });
});

router.post("/tasks/:taskId/complete", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const taskId = parseInt(req.params.taskId as string);
  const { answer } = req.body || {};

  const [task] = await db.select().from(tasksTable)
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.isActive, true)))
    .limit(1);

  if (!task) {
    res.status(404).json({ error: "Task not found or inactive" });
    return;
  }

  const [existing] = await db.select().from(taskCompletionsTable)
    .where(and(eq(taskCompletionsTable.userId, userId), eq(taskCompletionsTable.taskId, taskId)))
    .limit(1);

  if (existing) {
    res.status(400).json({ error: "Task already completed" });
    return;
  }

  if (task.question && task.correctAnswer) {
    if (!answer || answer.toLowerCase().trim() !== task.correctAnswer.toLowerCase().trim()) {
      res.status(400).json({ error: "Wrong answer" });
      return;
    }
  }

  await db.insert(taskCompletionsTable).values({ userId, taskId });

  const fcfaEarned = task.points * TASK_FCFA_RATE;

  const [updated] = await db.update(usersTable)
    .set({
      taskEarnings: sql`${usersTable.taskEarnings} + ${fcfaEarned}`,
      taskBalance: sql`${usersTable.taskBalance} + ${fcfaEarned}`,
    })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json({
    pointsEarned: task.points,
    fcfaEarned,
    newPoints: updated.points,
    newTaskBalance: parseFloat(updated.taskBalance || "0"),
  });
});

export default router;
