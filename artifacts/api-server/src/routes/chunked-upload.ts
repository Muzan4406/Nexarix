/**
 * Chunked file upload — contourne la limite Supabase Storage (50 Mo)
 * Découpe côté frontend, recolle côté serveur, stocke sur le disque Plesk.
 *
 * POST /api/admin/upload/chunk         — reçoit un morceau
 * POST /api/admin/upload/chunk/finalize — recolle et retourne l'URL publique
 * GET  /api/files/:filename             — sert le fichier (téléchargement)
 */
import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authMiddleware, adminMiddleware } from "../lib/auth";

const router = Router();

// ── Dossier de stockage persistant (à côté de dist/) ──────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
const CHUNKS_DIR  = path.join(UPLOADS_DIR, ".chunks");

// Crée les dossiers si absents
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(CHUNKS_DIR,  { recursive: true });

// multer mémoire — chaque chunk est au max 10 Mo (sécurité serveur)
const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("chunk");

// ── POST /api/admin/upload/chunk ──────────────────────────────────────────
router.post(
  "/admin/upload/chunk",
  authMiddleware,
  adminMiddleware,
  (req, res, next) => { chunkUpload(req, res, next); },
  async (req, res) => {
    const { uploadId, chunkIndex, totalChunks } = req.body as Record<string, string>;

    if (!uploadId || chunkIndex === undefined || !totalChunks || !req.file) {
      res.status(400).json({ error: "Paramètres manquants" });
      return;
    }

    // Sécurité : uploadId ne doit contenir que des caractères alphanumériques et tirets
    if (!/^[\w-]+$/.test(uploadId)) {
      res.status(400).json({ error: "uploadId invalide" });
      return;
    }

    const chunkPath = path.join(CHUNKS_DIR, `${uploadId}_${chunkIndex}`);
    await fsp.writeFile(chunkPath, req.file.buffer);

    res.json({ ok: true, chunkIndex });
  }
);

// ── POST /api/admin/upload/chunk/finalize ─────────────────────────────────
router.post(
  "/admin/upload/chunk/finalize",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const { uploadId, filename, totalChunks } = req.body as Record<string, string>;

    if (!uploadId || !filename || !totalChunks) {
      res.status(400).json({ error: "Paramètres manquants" });
      return;
    }
    if (!/^[\w-]+$/.test(uploadId)) {
      res.status(400).json({ error: "uploadId invalide" });
      return;
    }

    const n = parseInt(totalChunks, 10);
    const ext = path.extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, "");
    const finalName = `${uploadId}${ext}`;
    const finalPath = path.join(UPLOADS_DIR, finalName);

    // Assemble les morceaux dans l'ordre
    const writeStream = fs.createWriteStream(finalPath);
    for (let i = 0; i < n; i++) {
      const chunkPath = path.join(CHUNKS_DIR, `${uploadId}_${i}`);
      const data = await fsp.readFile(chunkPath);
      await new Promise<void>((resolve, reject) => {
        writeStream.write(data, (err) => (err ? reject(err) : resolve()));
      });
      // Supprime le chunk temp après lecture
      await fsp.unlink(chunkPath).catch(() => {});
    }
    await new Promise<void>((resolve) => writeStream.end(resolve));

    // L'URL publique pointe vers notre route de téléchargement
    const downloadUrl = `/api/files/${finalName}`;
    res.json({ ok: true, downloadUrl });
  }
);

// ── GET /api/files/:filename — sert le fichier ────────────────────────────
router.get("/files/:filename", (req, res) => {
  const filename = req.params.filename;

  // Sécurité : pas de path traversal
  if (!/^[\w.-]+$/.test(filename)) {
    res.status(400).json({ error: "Nom de fichier invalide" });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Fichier introuvable" });
    return;
  }

  // Force le téléchargement avec le nom d'origine si disponible
  res.download(filePath, filename, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: "Erreur lors du téléchargement" });
    }
  });
});

export default router;
