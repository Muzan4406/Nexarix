import { Router } from "express";
import { db } from "@workspace/db";
import { storeItemsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "../lib/auth";
import multer from "multer";
import path from "path";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

const router = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads", "store");

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
  limits: { fileSize: 1024 * 1024 * 1024 },
}).fields([
  { name: "file", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

// Serve uploaded files
router.get("/store/files/:filename", (req, res) => {
  const filename = path.basename(String(req.params.filename));
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.download(filePath);
});

// Public: list active store items
router.get("/store", authMiddleware, async (_req, res) => {
  const items = await db.select().from(storeItemsTable)
    .where(eq(storeItemsTable.isActive, true))
    .orderBy(asc(storeItemsTable.order), asc(storeItemsTable.createdAt));
  res.json(items.map(formatItem));
});

// Admin: list all store items
router.get("/admin/store", authMiddleware, adminMiddleware, async (_req, res) => {
  const items = await db.select().from(storeItemsTable)
    .orderBy(asc(storeItemsTable.order), asc(storeItemsTable.createdAt));
  res.json(items.map(formatItem));
});

// Admin: create store item
router.post("/admin/store", authMiddleware, adminMiddleware, upload, async (req, res) => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const { title, category, price, isFree, downloadUrl, fileType, fileSize, isActive, isPremium } = req.body;

  if (!title) {
    res.status(400).json({ error: "Le titre est requis" });
    return;
  }

  let finalDownloadUrl = downloadUrl || null;
  if (files?.file?.[0]) {
    finalDownloadUrl = `/api/store/files/${files.file[0].filename}`;
  }

  let thumbnailUrl: string | null = null;
  if (files?.thumbnail?.[0]) {
    thumbnailUrl = `/api/store/files/${files.thumbnail[0].filename}`;
  }

  const [item] = await db.insert(storeItemsTable).values({
    title,
    category: category || "app",
    price: price || "0",
    isFree: isFree === "true" || isFree === true,
    thumbnailUrl,
    downloadUrl: finalDownloadUrl,
    fileType: fileType || "apk",
    fileSize: fileSize || null,
    isActive: isActive !== "false" && isActive !== false,
    isPremium: isPremium !== "false" && isPremium !== false,
    order: 0,
  }).returning();

  res.status(201).json(formatItem(item));
});

// Admin: update store item
router.patch("/admin/store/:id", authMiddleware, adminMiddleware, upload, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const { title, category, price, isFree, downloadUrl, fileType, fileSize, isActive, isPremium } = req.body;

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (category !== undefined) updates.category = category;
  if (price !== undefined) updates.price = price;
  if (isFree !== undefined) updates.isFree = isFree === "true" || isFree === true;
  if (fileType !== undefined) updates.fileType = fileType;
  if (fileSize !== undefined) updates.fileSize = fileSize || null;
  if (isActive !== undefined) updates.isActive = isActive !== "false" && isActive !== false;
  if (isPremium !== undefined) updates.isPremium = isPremium !== "false" && isPremium !== false;

  if (files?.file?.[0]) {
    updates.downloadUrl = `/api/store/files/${files.file[0].filename}`;
  } else if (downloadUrl !== undefined) {
    updates.downloadUrl = downloadUrl || null;
  }

  if (files?.thumbnail?.[0]) {
    updates.thumbnailUrl = `/api/store/files/${files.thumbnail[0].filename}`;
  }

  const [item] = await db.update(storeItemsTable).set(updates).where(eq(storeItemsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Item introuvable" }); return; }
  res.json(formatItem(item));
});

// Admin: delete store item
router.delete("/admin/store/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const id = parseInt(String(req.params.id));
  await db.delete(storeItemsTable).where(eq(storeItemsTable.id, id));
  res.json({ ok: true });
});

function formatItem(item: any) {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    price: parseFloat(item.price || "0"),
    isFree: item.isFree,
    thumbnailUrl: item.thumbnailUrl,
    downloadUrl: item.downloadUrl,
    fileType: item.fileType,
    fileSize: item.fileSize,
    isActive: item.isActive,
    isPremium: item.isPremium,
    order: item.order,
    createdAt: item.createdAt?.toISOString(),
  };
}

export default router;
