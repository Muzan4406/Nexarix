import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, notificationReadsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "../lib/auth";

const router = Router();

const TITLE_MAX = 200;
const MESSAGE_MAX = 2000;

// GET /notifications — user gets all notifications with read status
router.get("/notifications", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;

  const notifications = await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  const reads = await db
    .select({ notificationId: notificationReadsTable.notificationId })
    .from(notificationReadsTable)
    .where(eq(notificationReadsTable.userId, userId));

  const readIds = new Set(reads.map(r => r.notificationId));

  const result = notifications.map(n => ({
    id: n.id,
    title: n.title,
    message: n.message,
    createdAt: n.createdAt?.toISOString(),
    read: readIds.has(n.id),
  }));

  res.json({
    notifications: result,
    unreadCount: result.filter(n => !n.read).length,
  });
});

// PATCH /notifications/:id/read — mark as read
router.patch("/notifications/:id/read", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const notificationId = parseInt(req.params.id, 10);

  if (!Number.isFinite(notificationId) || notificationId <= 0) {
    res.status(400).json({ error: "ID invalide" });
    return;
  }

  const existing = await db
    .select()
    .from(notificationReadsTable)
    .where(and(
      eq(notificationReadsTable.userId, userId),
      eq(notificationReadsTable.notificationId, notificationId),
    ))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(notificationReadsTable).values({ userId, notificationId });
  }

  res.json({ ok: true });
});

// PATCH /notifications/read-all — mark all as read
router.patch("/notifications/read-all", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;

  const allNotifs = await db.select({ id: notificationsTable.id }).from(notificationsTable);

  const reads = await db
    .select({ notificationId: notificationReadsTable.notificationId })
    .from(notificationReadsTable)
    .where(eq(notificationReadsTable.userId, userId));

  const readIds = new Set(reads.map(r => r.notificationId));
  const unread = allNotifs.filter(n => !readIds.has(n.id));

  if (unread.length > 0) {
    await db.insert(notificationReadsTable).values(
      unread.map(n => ({ userId, notificationId: n.id }))
    );
  }

  res.json({ ok: true });
});

// POST /admin/notifications — admin broadcasts notification to all
router.post("/admin/notifications", authMiddleware, adminMiddleware, async (req, res) => {
  const userId = (req as any).userId;
  const { title, message } = req.body;

  if (!title || !message) {
    res.status(400).json({ error: "Titre et message requis" });
    return;
  }
  if (typeof title !== "string" || title.trim().length === 0 || title.length > TITLE_MAX) {
    res.status(400).json({ error: `Titre invalide (max ${TITLE_MAX} caractères)` });
    return;
  }
  if (typeof message !== "string" || message.trim().length === 0 || message.length > MESSAGE_MAX) {
    res.status(400).json({ error: `Message invalide (max ${MESSAGE_MAX} caractères)` });
    return;
  }

  const [notification] = await db.insert(notificationsTable).values({
    title: title.trim(),
    message: message.trim(),
    createdBy: userId,
  }).returning();

  res.status(201).json({
    id: notification.id,
    title: notification.title,
    message: notification.message,
    createdAt: notification.createdAt?.toISOString(),
  });
});

// GET /admin/notifications — list all notifications (admin)
router.get("/admin/notifications", authMiddleware, adminMiddleware, async (req, res) => {
  const notifications = await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.createdAt));

  res.json(notifications.map(n => ({
    id: n.id,
    title: n.title,
    message: n.message,
    createdAt: n.createdAt?.toISOString(),
  })));
});

// DELETE /admin/notifications/:id — delete notification (admin)
router.delete("/admin/notifications/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const notifId = parseInt(req.params.id, 10);

  if (!Number.isFinite(notifId) || notifId <= 0) {
    res.status(400).json({ error: "ID invalide" });
    return;
  }

  await db.delete(notificationReadsTable).where(eq(notificationReadsTable.notificationId, notifId));
  await db.delete(notificationsTable).where(eq(notificationsTable.id, notifId));
  res.json({ ok: true });
});

export default router;
