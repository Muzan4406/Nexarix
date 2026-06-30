import { Router } from "express";
import { db } from "@workspace/db";
import { formationsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "../lib/auth";
import { sendTelegramNotification } from "../lib/telegram";
import { uploadToStorage, BUCKETS } from "../lib/supabase-storage";
import multer from "multer";
import path from "path";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
}).single("file");

// Public: list active formations
router.get("/formations", authMiddleware, async (_req, res) => {
  const formations = await db.select().from(formationsTable)
    .where(eq(formationsTable.isActive, true))
    .orderBy(asc(formationsTable.order), asc(formationsTable.createdAt));
  res.json(formations.map(formatFormation));
});

// Admin: list all formations
router.get("/admin/formations", authMiddleware, adminMiddleware, async (_req, res) => {
  const formations = await db.select().from(formationsTable)
    .orderBy(asc(formationsTable.order), asc(formationsTable.createdAt));
  res.json(formations.map(formatFormation));
});

// Admin: create formation
router.post("/admin/formations", authMiddleware, adminMiddleware, upload, async (req, res) => {
  const { title, description, videoUrl, isFree, isActive, price } = req.body;

  if (!title) {
    res.status(400).json({ error: "Le titre est requis" });
    return;
  }

  let contentUrl: string | null = null;
  if (req.file) {
    const ext = path.extname(req.file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    contentUrl = await uploadToStorage(BUCKETS.formations, filename, req.file.buffer, req.file.mimetype);
  }

  const priceVal = price && parseFloat(price) > 0 ? parseFloat(price).toFixed(2) : null;

  const [formation] = await db.insert(formationsTable).values({
    title,
    description: description || null,
    category: "general",
    videoUrl: videoUrl || null,
    contentUrl,
    isFree: isFree === "true" || isFree === true,
    price: priceVal,
    isActive: isActive !== "false" && isActive !== false,
    order: 0,
  }).returning();

  sendTelegramNotification(
    `📚 <b>Formation créée (Admin)</b>\n` +
    `📖 Titre: <b>${title}</b>\n` +
    `💰 Prix: ${priceVal ? `${parseFloat(priceVal).toLocaleString()} FCFA` : "Gratuit"}`
  );

  res.status(201).json(formatFormation(formation));
});

// Admin: update formation
router.patch("/admin/formations/:id", authMiddleware, adminMiddleware, upload, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { title, description, videoUrl, isFree, isActive, price } = req.body;

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description || null;
  if (videoUrl !== undefined) updates.videoUrl = videoUrl || null;
  if (isFree !== undefined) updates.isFree = isFree === "true" || isFree === true;
  if (isActive !== undefined) updates.isActive = isActive !== "false" && isActive !== false;
  if (price !== undefined) {
    updates.price = price && parseFloat(price) > 0 ? parseFloat(price).toFixed(2) : null;
  }

  if (req.file) {
    const ext = path.extname(req.file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    updates.contentUrl = await uploadToStorage(BUCKETS.formations, filename, req.file.buffer, req.file.mimetype);
  }

  const [formation] = await db.update(formationsTable).set(updates).where(eq(formationsTable.id, id)).returning();
  if (!formation) { res.status(404).json({ error: "Formation introuvable" }); return; }

  sendTelegramNotification(
    `✏️ <b>Formation modifiée (Admin)</b>\n` +
    `📖 Titre: <b>${formation.title}</b>`
  );

  res.json(formatFormation(formation));
});

// Admin: delete formation
router.delete("/admin/formations/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [formation] = await db.select().from(formationsTable).where(eq(formationsTable.id, id)).limit(1);
  await db.delete(formationsTable).where(eq(formationsTable.id, id));

  if (formation) {
    sendTelegramNotification(
      `🗑️ <b>Formation supprimée (Admin)</b>\n` +
      `📖 Titre: <b>${formation.title}</b>`
    );
  }

  res.json({ ok: true });
});

function formatFormation(f: any) {
  return {
    id: f.id,
    title: f.title,
    description: f.description,
    category: f.category,
    thumbnailUrl: f.thumbnailUrl,
    videoUrl: f.videoUrl,
    contentUrl: f.contentUrl,
    duration: f.duration,
    level: f.level,
    isFree: f.isFree,
    price: f.price ? parseFloat(f.price) : null,
    isActive: f.isActive,
    order: f.order,
    createdAt: f.createdAt?.toISOString(),
  };
}

export default router;
