import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, tasksTable, withdrawalsTable, siteSettingsTable, taskCompletionsTable } from "@workspace/db";
import { eq, or, ilike, sql } from "drizzle-orm";
import { signToken, authMiddleware, adminMiddleware } from "../lib/auth";

const router = Router();
const ADMIN_EMAIL = "godmuzan42@gmail.com";
const ADMIN_USERNAME = "Muzan4406";
const ADMIN_PASSWORD = "@admin4406";

router.post("/admin/login", async (req, res) => {
  const { identifier, password } = req.body;

  const isAdminIdentifier = identifier === ADMIN_EMAIL || identifier === ADMIN_USERNAME;
  const isAdminPassword = password === ADMIN_PASSWORD;

  if (!isAdminIdentifier || !isAdminPassword) {
    const adminUser = await db.select().from(usersTable)
      .where(or(eq(usersTable.email, identifier), eq(usersTable.username, identifier)))
      .limit(1);

    if (adminUser.length === 0 || !adminUser[0].isAdmin) {
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, adminUser[0].passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    const token = signToken({ userId: adminUser[0].id, isAdmin: true });
    res.json({ token, user: formatUser(adminUser[0]) });
    return;
  }

  let [adminUser] = await db.select().from(usersTable)
    .where(eq(usersTable.email, ADMIN_EMAIL)).limit(1);

  if (!adminUser) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    [adminUser] = await db.insert(usersTable).values({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      phone: "0000000000",
      country: "Togo",
      passwordHash,
      status: "active",
      membership: "Premium",
      isAdmin: true,
    }).returning();
  }

  const token = signToken({ userId: adminUser.id, isAdmin: true });
  res.json({ token, user: formatUser(adminUser) });
});

router.get("/admin/dashboard", authMiddleware, adminMiddleware, async (req, res) => {
  const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
    .where(eq(usersTable.isAdmin, false));
  const activeUsers = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
    .where(sql`${usersTable.status} = 'active' AND ${usersTable.isAdmin} = false`);
  const inactiveUsers = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
    .where(sql`${usersTable.status} = 'inactive' AND ${usersTable.isAdmin} = false`);

  const pointsData = await db.select({
    totalPoints: sql<number>`sum(${usersTable.points})`,
  }).from(usersTable);

  const pendingWithdrawals = await db.select({
    total: sql<number>`sum(${withdrawalsTable.amountGross})`,
  }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "pending"));

  const paidWithdrawals = await db.select({
    total: sql<number>`sum(${withdrawalsTable.amountNet})`,
  }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "paid"));

  const activationFees = Number(activeUsers[0].count) * 3000;

  const recentRegistrations = await db.select({ count: sql<number>`count(*)` })
    .from(usersTable)
    .where(sql`${usersTable.joinedAt} > now() - interval '7 days' AND ${usersTable.isAdmin} = false`);

  res.json({
    totalUsers: Number(totalUsers[0].count),
    activeUsers: Number(activeUsers[0].count),
    inactiveUsers: Number(inactiveUsers[0].count),
    totalActivationFees: activationFees,
    totalPointsGenerated: Number(pointsData[0]?.totalPoints || 0),
    totalPointsConverted: 0,
    pendingWithdrawals: Number(pendingWithdrawals[0]?.total || 0),
    paidWithdrawals: Number(paidWithdrawals[0]?.total || 0),
    recentRegistrations: Number(recentRegistrations[0].count),
  });
});

router.get("/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
  const { search, status } = req.query as { search?: string; status?: string };

  let query = db.select().from(usersTable).where(eq(usersTable.isAdmin, false));

  const users = await db.select().from(usersTable)
    .where(eq(usersTable.isAdmin, false));

  let filtered = users;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(u =>
      u.username.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      u.phone.includes(s)
    );
  }
  if (status) {
    filtered = filtered.filter(u => u.status === status);
  }

  const result = await Promise.all(filtered.map(async user => {
    const [dl] = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
      .where(eq(usersTable.upline, user.username));
    return { ...formatAdminUser(user), totalDownlines: Number(dl.count) };
  }));

  res.json(result);
});

router.get("/admin/users/:userId", authMiddleware, adminMiddleware, async (req, res) => {
  const userId = parseInt(req.params.userId as string);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [dl] = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
    .where(eq(usersTable.upline, user.username));
  res.json({ ...formatAdminUser(user), totalDownlines: Number(dl.count) });
});

router.patch("/admin/users/:userId", authMiddleware, adminMiddleware, async (req, res) => {
  const userId = parseInt(req.params.userId as string);
  const { balance, points, status, upline, password, isBanned } = req.body;

  const updates: any = {};
  if (balance !== undefined) updates.balance = balance.toString();
  if (points !== undefined) updates.points = points;
  if (status !== undefined) updates.status = status;
  if (upline !== undefined) updates.upline = upline;
  if (isBanned !== undefined) updates.isBanned = isBanned;
  if (password) {
    updates.passwordHash = await bcrypt.hash(password, 10);
  }

  if (status === "active") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user && user.status !== "active") {
      updates.membership = "Premium";
      await distributeMLMCommissions(user);
    }
  }

  const [updated] = await db.update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [dl] = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
    .where(eq(usersTable.upline, updated.username));
  res.json({ ...formatAdminUser(updated), totalDownlines: Number(dl.count) });
});

async function distributeMLMCommissions(user: any) {
  if (!user.upline) return;

  const commissions = [
    { level: 1, amount: 1300 },
    { level: 2, amount: 700 },
    { level: 3, amount: 400 },
  ];

  let currentUplineUsername = user.upline;
  for (const { level, amount } of commissions) {
    if (!currentUplineUsername) break;
    const [uplineUser] = await db.select().from(usersTable)
      .where(eq(usersTable.username, currentUplineUsername)).limit(1);
    if (!uplineUser) break;

    const mlmField = level === 1 ? usersTable.mlmEarningsL1
      : level === 2 ? usersTable.mlmEarningsL2
      : usersTable.mlmEarningsL3;

    await db.update(usersTable).set({
      balance: sql`${usersTable.balance} + ${amount}`,
      [level === 1 ? "mlmEarningsL1" : level === 2 ? "mlmEarningsL2" : "mlmEarningsL3"]: sql`${mlmField} + ${amount}`,
    }).where(eq(usersTable.id, uplineUser.id));

    currentUplineUsername = uplineUser.upline;
  }
}

router.get("/admin/tasks", authMiddleware, adminMiddleware, async (req, res) => {
  const tasks = await db.select().from(tasksTable).orderBy(sql`${tasksTable.createdAt} DESC`);
  res.json(tasks.map(formatTask));
});

router.post("/admin/tasks", authMiddleware, adminMiddleware, async (req, res) => {
  const { category, title, description, targetUrl, points, isActive, question, correctAnswer } = req.body;

  if (!category || !title || !targetUrl || !points) {
    res.status(400).json({ error: "category, title, targetUrl and points are required" });
    return;
  }

  const [task] = await db.insert(tasksTable).values({
    category,
    title,
    description: description || null,
    targetUrl,
    points,
    isActive: isActive ?? true,
    question: question || null,
    correctAnswer: correctAnswer || null,
  }).returning();

  res.status(201).json(formatTask(task));
});

router.patch("/admin/tasks/:taskId", authMiddleware, adminMiddleware, async (req, res) => {
  const taskId = parseInt(req.params.taskId as string);
  const updates: any = {};
  const fields = ["category", "title", "description", "targetUrl", "points", "isActive", "question", "correctAnswer"];
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }

  const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, taskId)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(formatTask(task));
});

router.delete("/admin/tasks/:taskId", authMiddleware, adminMiddleware, async (req, res) => {
  const taskId = parseInt(req.params.taskId as string);
  await db.delete(taskCompletionsTable).where(eq(taskCompletionsTable.taskId, taskId));
  await db.delete(tasksTable).where(eq(tasksTable.id, taskId));
  res.json({ success: true });
});

router.get("/admin/withdrawals", authMiddleware, adminMiddleware, async (req, res) => {
  const { status } = req.query as { status?: string };

  const withdrawals = await db.select({
    withdrawal: withdrawalsTable,
    username: usersTable.username,
  }).from(withdrawalsTable)
    .innerJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
    .orderBy(sql`${withdrawalsTable.createdAt} DESC`);

  let result = withdrawals;
  if (status) {
    result = result.filter(r => r.withdrawal.status === status);
  }

  res.json(result.map(r => ({
    id: r.withdrawal.id,
    userId: r.withdrawal.userId,
    username: r.username,
    type: r.withdrawal.type,
    operator: r.withdrawal.operator,
    phone: r.withdrawal.phone,
    amountGross: parseFloat(r.withdrawal.amountGross || "0"),
    fee: parseFloat(r.withdrawal.fee || "0"),
    amountNet: parseFloat(r.withdrawal.amountNet || "0"),
    status: r.withdrawal.status,
    rejectionReason: r.withdrawal.rejectionReason,
    createdAt: r.withdrawal.createdAt?.toISOString(),
  })));
});

router.patch("/admin/withdrawals/:withdrawalId/approve", authMiddleware, adminMiddleware, async (req, res) => {
  const withdrawalId = parseInt(req.params.withdrawalId as string);

  const [withdrawal] = await db.select({
    withdrawal: withdrawalsTable,
    username: usersTable.username,
  }).from(withdrawalsTable)
    .innerJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
    .where(eq(withdrawalsTable.id, withdrawalId))
    .limit(1);

  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  const [updated] = await db.update(withdrawalsTable)
    .set({ status: "paid" })
    .where(eq(withdrawalsTable.id, withdrawalId))
    .returning();

  res.json({
    ...formatAdminWithdrawal(updated),
    username: withdrawal.username,
    userId: updated.userId,
  });
});

router.patch("/admin/withdrawals/:withdrawalId/reject", authMiddleware, adminMiddleware, async (req, res) => {
  const withdrawalId = parseInt(req.params.withdrawalId as string);
  const { reason } = req.body;

  if (!reason) {
    res.status(400).json({ error: "Rejection reason is required" });
    return;
  }

  const [withUser] = await db.select({
    withdrawal: withdrawalsTable,
    username: usersTable.username,
    userId: usersTable.id,
  }).from(withdrawalsTable)
    .innerJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
    .where(eq(withdrawalsTable.id, withdrawalId))
    .limit(1);

  if (!withUser) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  await db.update(usersTable).set({
    balance: sql`${usersTable.balance} + ${withUser.withdrawal.amountGross}`,
    totalWithdrawn: sql`${usersTable.totalWithdrawn} - ${withUser.withdrawal.amountNet}`,
  }).where(eq(usersTable.id, withUser.userId));

  const [updated] = await db.update(withdrawalsTable)
    .set({ status: "rejected", rejectionReason: reason })
    .where(eq(withdrawalsTable.id, withdrawalId))
    .returning();

  res.json({
    ...formatAdminWithdrawal(updated),
    username: withUser.username,
    userId: updated.userId,
  });
});

router.get("/admin/settings", authMiddleware, adminMiddleware, async (req, res) => {
  let [settings] = await db.select().from(siteSettingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(siteSettingsTable).values({}).returning();
  }
  res.json({
    ...settings,
    activationFee: parseFloat(settings.activationFee || "3000"),
  });
});

router.patch("/admin/settings", authMiddleware, adminMiddleware, async (req, res) => {
  const { supportEmail, telegramLink, whatsappLink, vcfLink, activationFee, paymentMode, sendavapayApiKey, sendavapayMerchantId, appBaseUrl } = req.body;

  let [settings] = await db.select().from(siteSettingsTable).limit(1);
  const updates: any = {};
  if (supportEmail !== undefined) updates.supportEmail = supportEmail;
  if (telegramLink !== undefined) updates.telegramLink = telegramLink;
  if (whatsappLink !== undefined) updates.whatsappLink = whatsappLink;
  if (vcfLink !== undefined) updates.vcfLink = vcfLink;
  if (activationFee !== undefined) updates.activationFee = activationFee.toString();
  if (paymentMode !== undefined) updates.paymentMode = paymentMode;
  if (sendavapayApiKey !== undefined) updates.sendavapayApiKey = sendavapayApiKey;
  if (sendavapayMerchantId !== undefined) updates.sendavapayMerchantId = sendavapayMerchantId;
  if (appBaseUrl !== undefined) updates.appBaseUrl = appBaseUrl;

  if (!settings) {
    [settings] = await db.insert(siteSettingsTable).values(updates).returning();
  } else {
    [settings] = await db.update(siteSettingsTable).set(updates).where(eq(siteSettingsTable.id, settings.id)).returning();
  }

  res.json({
    ...settings,
    activationFee: parseFloat(settings.activationFee || "3000"),
  });
});

function formatUser(user: any) {
  return {
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
    isAdmin: user.isAdmin,
  };
}

function formatAdminUser(user: any) {
  return {
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
    joinedAt: user.joinedAt?.toISOString(),
    isBanned: user.isBanned ?? false,
    totalDownlines: 0,
  };
}

function formatTask(task: any) {
  return {
    id: task.id,
    category: task.category,
    title: task.title,
    description: task.description,
    targetUrl: task.targetUrl,
    points: task.points,
    isActive: task.isActive,
    question: task.question,
    correctAnswer: task.correctAnswer,
    completedAt: null,
    createdAt: task.createdAt?.toISOString(),
  };
}

function formatAdminWithdrawal(w: any) {
  return {
    id: w.id,
    type: w.type,
    operator: w.operator,
    phone: w.phone,
    amountGross: parseFloat(w.amountGross || "0"),
    fee: parseFloat(w.fee || "0"),
    amountNet: parseFloat(w.amountNet || "0"),
    status: w.status,
    rejectionReason: w.rejectionReason,
    createdAt: w.createdAt?.toISOString(),
  };
}

export default router;
