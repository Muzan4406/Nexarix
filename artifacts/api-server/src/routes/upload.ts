import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../lib/auth";
import { getPresignedUploadUrl, BUCKETS } from "../lib/supabase-storage";
import path from "path";

const router = Router();

const ALLOWED_BUCKETS = new Set(Object.values(BUCKETS));

// Admin: get a presigned upload URL so the browser can upload directly to Supabase
router.post("/admin/upload/presign", authMiddleware, adminMiddleware, async (req, res) => {
  const { bucket, originalName } = req.body as { bucket?: string; originalName?: string };

  if (!bucket || !ALLOWED_BUCKETS.has(bucket)) {
    res.status(400).json({ error: "Bucket invalide" });
    return;
  }

  const ext = originalName ? path.extname(originalName) : "";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  try {
    const { signedUrl, publicUrl } = await getPresignedUploadUrl(bucket, filename);
    res.json({ signedUrl, publicUrl, filename });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

export default router;
