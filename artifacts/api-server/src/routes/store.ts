import { Router } from "express";
import { db } from "@workspace/db";
import { storeItemsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "../lib/auth";
import { uploadToStorage, BUCKETS } from "../lib/supabase-storage";
import multer from "multer";
import path from "path";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
}).fields([
  { name: "file", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

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
  const { title, category, price, isFree, fileType, fileSize, isActive, isPremium,
          downloadUrl: bodyDownloadUrl, thumbnailUrl: bodyThumbnailUrl } = req.body;

  if (!title) {
    res.status(400).json({ error: "Le titre est requis" });
    return;
  }

  // Accept URL directly (presigned upload) or fall back to server-side upload
  let downloadUrl: string | null = bodyDownloadUrl || null;
  if (!downloadUrl && files?.file?.[0]) {
    const f = files.file[0];
    const ext = path.extname(f.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    downloadUrl = await uploadToStorage(BUCKETS.store, filename, f.buffer, f.mimetype);
  }

  let thumbnailUrl: string | null = bodyThumbnailUrl || null;
  if (!thumbnailUrl && files?.thumbnail?.[0]) {
    const t = files.thumbnail[0];
    const ext = path.extname(t.originalname);
    const filename = `thumb-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    thumbnailUrl = await uploadToStorage(BUCKETS.store, filename, t.buffer, t.mimetype);
  }

  const [item] = await db.insert(storeItemsTable).values({
    title,
    category: category || "app",
    price: price || "0",
    isFree: isFree === "true" || isFree === true,
    thumbnailUrl,
    downloadUrl,
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
  const { title, category, price, isFree, fileType, fileSize, isActive, isPremium,
          downloadUrl: bodyDownloadUrl, thumbnailUrl: bodyThumbnailUrl } = req.body;

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (category !== undefined) updates.category = category;
  if (price !== undefined) updates.price = price;
  if (isFree !== undefined) updates.isFree = isFree === "true" || isFree === true;
  if (fileType !== undefined) updates.fileType = fileType;
  if (fileSize !== undefined) updates.fileSize = fileSize || null;
  if (isActive !== undefined) updates.isActive = isActive !== "false" && isActive !== false;
  if (isPremium !== undefined) updates.isPremium = isPremium !== "false" && isPremium !== false;

  // Accept URL directly (presigned upload) or fall back to server-side upload
  if (bodyDownloadUrl) {
    updates.downloadUrl = bodyDownloadUrl;
  } else if (files?.file?.[0]) {
    const f = files.file[0];
    const ext = path.extname(f.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    updates.downloadUrl = await uploadToStorage(BUCKETS.store, filename, f.buffer, f.mimetype);
  }

  if (bodyThumbnailUrl) {
    updates.thumbnailUrl = bodyThumbnailUrl;
  } else if (files?.thumbnail?.[0]) {
    const t = files.thumbnail[0];
    const ext = path.extname(t.originalname);
    const filename = `thumb-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    updates.thumbnailUrl = await uploadToStorage(BUCKETS.store, filename, t.buffer, t.mimetype);
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
