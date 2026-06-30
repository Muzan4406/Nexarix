import { Router } from "express";
import { db } from "@workspace/db";
import { formationsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "../lib/auth";
import multer from "multer";
import path from "path";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

const router = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads", "formations");

async function ensureUploadDir() {
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await ensureUploadDir();
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

// Serve uploaded files
router.get("/formations/files/:filename", (req, res) => {
  const filename = path.basename(String(req.params.filename));
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.download(filePath);
});

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

// Admin: create formation (with optional file upload)
router.post("/admin/formations", authMiddleware, adminMiddleware, upload.single("file"), async (req, res) => {
  const { title, description, category, thumbnailUrl, videoUrl, duration, level, isFree, isActive, order } = req.body;

  if (!title) {
    res.status(400).json({ error: "Le titre est requis" });
    return;
  }

  let contentUrl = req.body.contentUrl || null;
  if (req.file) {
    contentUrl = `/api/formations/files/${req.file.filename}`;
  }

  const [formation] = await db.insert(formationsTable).values({
    title,
    description: description || null,
    category: category || "general",
    thumbnailUrl: thumbnailUrl || null,
    videoUrl: videoUrl || null,
    contentUrl,
    duration: duration || null,
    level: level || "debutant",
    isFree: isFree === "true" || isFree === true,
    isActive: isActive !== "false" && isActive !== false,
    order: parseInt(order) || 0,
  }).returning();

  res.status(201).json(formatFormation(formation));
});

// Admin: update formation
router.patch("/admin/formations/:id", authMiddleware, adminMiddleware, upload.single("file"), async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { title, description, category, thumbnailUrl, videoUrl, contentUrl, duration, level, isFree, isActive, order } = req.body;

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description || null;
  if (category !== undefined) updates.category = category;
  if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl || null;
  if (videoUrl !== undefined) updates.videoUrl = videoUrl || null;
  if (duration !== undefined) updates.duration = duration || null;
  if (level !== undefined) updates.level = level;
  if (isFree !== undefined) updates.isFree = isFree === "true" || isFree === true;
  if (isActive !== undefined) updates.isActive = isActive !== "false" && isActive !== false;
  if (order !== undefined) updates.order = parseInt(order) || 0;

  if (req.file) {
    updates.contentUrl = `/api/formations/files/${req.file.filename}`;
  } else if (contentUrl !== undefined) {
    updates.contentUrl = contentUrl || null;
  }

  const [formation] = await db.update(formationsTable).set(updates).where(eq(formationsTable.id, id)).returning();
  if (!formation) { res.status(404).json({ error: "Formation introuvable" }); return; }
  res.json(formatFormation(formation));
});

// Admin: delete formation
router.delete("/admin/formations/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const id = parseInt(String(req.params.id));
  await db.delete(formationsTable).where(eq(formationsTable.id, id));
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
    isActive: f.isActive,
    order: f.order,
    createdAt: f.createdAt?.toISOString(),
  };
}

export default router;
