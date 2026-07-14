/**
 * Centralised security helpers:
 *  - Rate limiters (express-rate-limit) — in-memory, per-IP, all windows 24h
 *  - Intrusion alert via Telegram
 *  - IP extraction utility
 */

import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { sendTelegramNotification, escapeHtml } from "./telegram";
import { db, blockedIpsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ─── IP helper (works behind Plesk / Nginx reverse proxy) ───────────────────
export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

// ─── Blocage permanent des IP (persistant en base, survit aux redémarrages) ──
// Contrairement aux limiteurs express-rate-limit (en mémoire, fenêtre glissante),
// une IP bloquée ici reste bloquée définitivement jusqu'à un déblocage manuel
// depuis le site admin.

// Petit cache mémoire (15s) pour éviter une requête DB sur chaque appel API.
const blockedIpCache = new Map<string, { blocked: boolean; checkedAt: number }>();
const CACHE_TTL_MS = 15_000;

/** Bloque définitivement une IP et envoie une alerte Telegram. Idempotent. */
export async function blockIp(ip: string, reason: string, req?: Request): Promise<void> {
  if (!ip || ip === "unknown") return;
  try {
    await db
      .insert(blockedIpsTable)
      .values({ ip, reason, blockedAt: Date.now() })
      .onConflictDoNothing({ target: blockedIpsTable.ip });
    blockedIpCache.set(ip, { blocked: true, checkedAt: Date.now() });
  } catch (err) {
    console.error("[security] Échec du blocage IP en base:", err);
  }

  const ua = req ? escapeHtml((req.headers["user-agent"] ?? "—").slice(0, 120)) : "—";
  await sendTelegramNotification(
    `⛔️ <b>IP BLOQUÉE DÉFINITIVEMENT</b>\n` +
    `🌐 IP: <code>${escapeHtml(ip)}</code>\n` +
    `📄 Raison: ${escapeHtml(reason)}\n` +
    `🖥️ User-Agent: ${ua}\n` +
    `\nCette IP ne peut plus accéder au site. Débloquez-la depuis le panneau admin si nécessaire.`
  ).catch(() => {});
}

/** Vérifie si une IP est bloquée (avec cache court pour limiter les requêtes DB). */
export async function isIpBlocked(ip: string): Promise<boolean> {
  const cached = blockedIpCache.get(ip);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return cached.blocked;
  }
  try {
    const rows = await db
      .select({ ip: blockedIpsTable.ip })
      .from(blockedIpsTable)
      .where(eq(blockedIpsTable.ip, ip))
      .limit(1);
    const blocked = rows.length > 0;
    blockedIpCache.set(ip, { blocked, checkedAt: Date.now() });
    return blocked;
  } catch (err) {
    console.error("[security] Échec de la vérification IP bloquée:", err);
    return false; // fail-open sur erreur DB pour ne pas bloquer tout le site en cas de panne
  }
}

/** Middleware à monter tôt dans app.ts : rejette toute requête venant d'une IP bloquée. */
export async function blockedIpGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = getClientIp(req);
  if (await isIpBlocked(ip)) {
    res.status(403).json({ error: "Accès refusé. Cette adresse IP a été bloquée définitivement." });
    return;
  }
  next();
}

// ─── Intrusion alert ─────────────────────────────────────────────────────────
export async function alertIntrusion(event: string, details: string, req: Request): Promise<void> {
  const ip = getClientIp(req);
  const ua = escapeHtml((req.headers["user-agent"] ?? "—").slice(0, 120));
  const path = escapeHtml(req.originalUrl?.split("?")[0] ?? req.path);
  await sendTelegramNotification(
    `🚨 <b>ALERTE SÉCURITÉ — ${escapeHtml(event)}</b>\n` +
    `🌐 IP: <code>${escapeHtml(ip)}</code>\n` +
    `📍 Endpoint: <code>${req.method} ${path}</code>\n` +
    `${details}\n` +
    `🖥️ User-Agent: ${ua}`
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Rate limiters (in-memory, per IP, 24h blocking window) ─────────────────

/** Public login: 10 tentatives / 24h per IP → blocage définitif au-delà */
export const loginLimiter = rateLimit({
  windowMs: DAY_MS,
  max: 10,
  keyGenerator: getClientIp,
  handler: async (req: Request, res: Response) => {
    await blockIp(getClientIp(req), "Force brute sur la connexion (10 tentatives dépassées)", req);
    res.status(403).json({ error: "Trop de tentatives de connexion. Cette IP a été bloquée définitivement." });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Registration: 5 comptes / 24h per IP → blocage définitif au-delà */
export const registerLimiter = rateLimit({
  windowMs: DAY_MS,
  max: 5,
  keyGenerator: getClientIp,
  handler: async (req: Request, res: Response) => {
    await blockIp(getClientIp(req), "Abus d'inscriptions (5 comptes dépassés, bot probable)", req);
    res.status(403).json({ error: "Trop d'inscriptions depuis cette adresse. Cette IP a été bloquée définitivement." });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Admin login: 5 tentatives / 24h per IP → blocage définitif au-delà */
export const adminLoginLimiter = rateLimit({
  windowMs: DAY_MS,
  max: 5,
  keyGenerator: getClientIp,
  handler: async (req: Request, res: Response) => {
    await blockIp(getClientIp(req), "Force brute sur la connexion admin (5 tentatives dépassées)", req);
    res.status(403).json({ error: "Trop de tentatives admin. Cette IP a été bloquée définitivement." });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** OTP verify: 5 essais / 24h per IP → blocage définitif au-delà */
export const otpLimiter = rateLimit({
  windowMs: DAY_MS,
  max: 5,
  keyGenerator: getClientIp,
  handler: async (req: Request, res: Response) => {
    await blockIp(getClientIp(req), "Force brute sur le code OTP (5 tentatives dépassées)", req);
    res.status(403).json({ error: "Trop de tentatives OTP. Cette IP a été bloquée définitivement." });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Confirmation de retrait: 5 essais / 24h per IP (code secret statique) → blocage définitif au-delà */
export const withdrawalConfirmLimiter = rateLimit({
  windowMs: DAY_MS,
  max: 5,
  keyGenerator: getClientIp,
  handler: async (req: Request, res: Response) => {
    await blockIp(getClientIp(req), "Force brute sur le code de confirmation de retrait (5 tentatives dépassées)", req);
    res.status(403).json({ error: "Trop de tentatives. Cette IP a été bloquée définitivement." });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** API générale: 200 req / min per IP (anti-bot/scan) → blocage définitif au-delà */
export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  keyGenerator: getClientIp,
  handler: async (req: Request, res: Response) => {
    await blockIp(getClientIp(req), "Scan/bot détecté (plus de 200 requêtes/min)", req);
    res.status(403).json({ error: "Trop de requêtes. Cette IP a été bloquée définitivement." });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Brute-force login tracker (in-memory, resets on restart) ────────────────
// Tracks consecutive failed logins per IP to alert on Telegram before lockout.
const failedLoginMap = new Map<string, { count: number; alertedAt: number }>();

export function trackFailedLogin(req: Request, identifier: string): void {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = failedLoginMap.get(ip) ?? { count: 0, alertedAt: 0 };
  entry.count += 1;

  // Alert on 3rd and every 5th attempt after that
  const shouldAlert = entry.count === 3 || (entry.count > 3 && (entry.count - 3) % 5 === 0);
  if (shouldAlert && now - entry.alertedAt > 60_000) {
    entry.alertedAt = now;
    alertIntrusion(
      "TENTATIVES DE CONNEXION SUSPECTES",
      `👤 Identifiant: <code>${escapeHtml(identifier.slice(0, 40))}</code>\n` +
      `🔢 Tentatives échouées: <b>${entry.count}</b>`,
      req
    ).catch(() => {});
  }

  failedLoginMap.set(ip, entry);
  // Auto-clean after 24h
  setTimeout(() => failedLoginMap.delete(ip), DAY_MS);
}

export function resetFailedLogin(req: Request): void {
  failedLoginMap.delete(getClientIp(req));
}
