import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, taskCompletionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

const MIN_POINTS_TO_CONVERT = 1000;
const POINTS_TO_FCFA_RATE = 0.5; // 1000 pts = 500 FCFA

router.get("/users/dashboard", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const downlineCount = await db.select({ count: sql<number>`count(*)` })
    .from(usersTable)
    .where(eq(usersTable.upline, user.username));

  const completedTasksCount = await db.select({ count: sql<number>`count(*)` })
    .from(taskCompletionsTable)
    .where(eq(taskCompletionsTable.userId, userId));

  const balance = parseFloat(user.balance || "0");
  const totalWithdrawn = parseFloat(user.totalWithdrawn || "0");
  const mlmL1 = parseFloat(user.mlmEarningsL1 || "0");
  const mlmL2 = parseFloat(user.mlmEarningsL2 || "0");
  const mlmL3 = parseFloat(user.mlmEarningsL3 || "0");
  const tasks = parseFloat(user.taskEarnings || "0");
  const welcomeBonus = parseFloat(user.welcomeBonus || "0");
  const totalEarned = mlmL1 + mlmL2 + mlmL3 + tasks + welcomeBonus;
  const totalBalance = balance + totalWithdrawn;

  res.json({
    balance,
    points: user.points,
    totalWithdrawn,
    totalEarned,
    totalBalance,
    welcomeBonus,
    downlineCount: Number(downlineCount[0]?.count || 0),
    completedTasks: Number(completedTasksCount[0]?.count || 0),
    referralLink: `https://nexarix.com/register/${user.username}`,
    earnings: { mlmLevel1: mlmL1, mlmLevel2: mlmL2, mlmLevel3: mlmL3, tasks },
  });
});

router.get("/users/profile", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const downlineCount = await db.select({ count: sql<number>`count(*)` })
    .from(usersTable)
    .where(eq(usersTable.upline, user.username));

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    country: user.country,
    status: user.status,
    membership: user.membership,
    balance: parseFloat(user.balance || "0"),
    points: user.points,
    upline: user.upline,
    avatarUrl: user.avatarUrl,
    joinedAt: user.joinedAt?.toISOString(),
    totalDownlines: Number(downlineCount[0]?.count || 0),
    totalWithdrawn: parseFloat(user.totalWithdrawn || "0"),
  });
});

router.patch("/users/profile", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const { avatarUrl } = req.body;

  const [user] = await db.update(usersTable)
    .set({ avatarUrl })
    .where(eq(usersTable.id, userId))
    .returning();

  const downlineCount = await db.select({ count: sql<number>`count(*)` })
    .from(usersTable)
    .where(eq(usersTable.upline, user.username));

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    country: user.country,
    status: user.status,
    membership: user.membership,
    balance: parseFloat(user.balance || "0"),
    points: user.points,
    upline: user.upline,
    avatarUrl: user.avatarUrl,
    joinedAt: user.joinedAt?.toISOString(),
    totalDownlines: Number(downlineCount[0]?.count || 0),
    totalWithdrawn: parseFloat(user.totalWithdrawn || "0"),
  });
});

router.post("/users/convert-points", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user || user.points < MIN_POINTS_TO_CONVERT) {
    res.status(400).json({ error: `Minimum ${MIN_POINTS_TO_CONVERT} points required to convert` });
    return;
  }

  const setsOf1000 = Math.floor(user.points / MIN_POINTS_TO_CONVERT);
  const pointsToConvert = setsOf1000 * MIN_POINTS_TO_CONVERT;
  const fcfaToAdd = setsOf1000 * (MIN_POINTS_TO_CONVERT * POINTS_TO_FCFA_RATE);

  const [updated] = await db.update(usersTable)
    .set({
      points: user.points - pointsToConvert,
      balance: sql`${usersTable.balance} + ${fcfaToAdd}`,
    })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json({
    pointsConverted: pointsToConvert,
    fcfaAdded: fcfaToAdd,
    newBalance: parseFloat(updated.balance || "0"),
    newPoints: updated.points,
  });
});

export default router;
