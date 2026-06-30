import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { servicesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "../lib/auth";
import { uploadToStorage } from "../lib/supabase-storage";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const BUCKET = "service-images";

// ── User: list active services ──────────────────────────────────────────────
router.get("/services", authMiddleware, async (_req, res) => {
  const items = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.isActive, true))
    .orderBy(asc(servicesTable.order), asc(servicesTable.createdAt));
  res.json(items);
});

// ── Admin: list all services ─────────────────────────────────────────────────
router.get("/admin/services", authMiddleware, adminMiddleware, async (_req, res) => {
  const items = await db
    .select()
    .from(servicesTable)
    .orderBy(asc(servicesTable.order), asc(servicesTable.createdAt));
  res.json(items);
});

// ── Admin: create service ────────────────────────────────────────────────────
router.post(
  "/admin/services",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  async (req, res) => {
    const { title, description, linkUrl, isActive, order } = req.body;
    if (!title || !linkUrl) {
      res.status(400).json({ error: "Titre et lien requis" });
      return;
    }

    let imageUrl: string | undefined;
    if (req.file) {
      const ext = req.file.originalname.split(".").pop() || "jpg";
      const filename = `service-${Date.now()}.${ext}`;
      imageUrl = await uploadToStorage(BUCKET, filename, req.file.buffer, req.file.mimetype);
    }

    const [item] = await db
      .insert(servicesTable)
      .values({
        title,
        description: description || null,
        imageUrl: imageUrl || null,
        linkUrl,
        isActive: isActive === "false" ? false : true,
        order: order ? parseInt(order) : 0,
      })
      .returning();

    res.json(item);
  }
);

// ── Admin: update service ────────────────────────────────────────────────────
router.patch(
  "/admin/services/:id",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  async (req, res) => {
    const id = parseInt(req.params.id as string);
    const { title, description, linkUrl, isActive, order } = req.body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description || null;
    if (linkUrl !== undefined) updates.linkUrl = linkUrl;
    if (isActive !== undefined) updates.isActive = isActive === "true";
    if (order !== undefined) updates.order = parseInt(order);

    if (req.file) {
      const ext = req.file.originalname.split(".").pop() || "jpg";
      const filename = `service-${Date.now()}.${ext}`;
      updates.imageUrl = await uploadToStorage(BUCKET, filename, req.file.buffer, req.file.mimetype);
    }

    const [item] = await db
      .update(servicesTable)
      .set(updates)
      .where(eq(servicesTable.id, id))
      .returning();

    if (!item) { res.status(404).json({ error: "Service introuvable" }); return; }
    res.json(item);
  }
);

// ── Admin: delete service ────────────────────────────────────────────────────
router.delete("/admin/services/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const id = parseInt(req.params.id as string);
  await db.delete(servicesTable).where(eq(servicesTable.id, id));
  res.json({ success: true });
});

export default router;
