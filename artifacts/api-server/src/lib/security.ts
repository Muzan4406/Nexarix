/**
 * Centralised security helpers:
 *  - Rate limiters (express-rate-limit) — in-memory, per-IP, all windows 24h
 *  - Intrusion alert via Telegram
 *  - IP extraction utility
 */

import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { sendTelegramNotification } from "./telegram";

// ─── IP helper (works behind Plesk / Nginx reverse proxy) ───────────────────
export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

// ─── Intrusion alert ─────────────────────────────────────────────────────────
export async function alertIntrusion(event: string, details: string, req: Request): Promise<void> {
  const ip = getClientIp(req);
  const ua = (req.headers["user-agent"] ?? "—").slice(0, 120);
  const path = req.originalUrl?.split("?")[0] ?? req.path;
  await sendTelegramNotification(
    `🚨 <b>ALERTE SÉCURITÉ — ${event}</b>\n` +
    `🌐 IP: <code>${ip}</code>\n` +
    `📍 Endpoint: <code>${req.method} ${path}</code>\n` +
    `${details}\n` +
    `🖥️ User-Agent: ${ua}`
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Rate limiters (in-memory, per IP, 24h blocking window) ─────────────────

/** Public login: 10 tentatives / 24h per IP */
export const loginLimiter = rateLimit({
  windowMs: DAY_MS,
  max: 10,
  keyGenerator: getClientIp,
  handler: async (req: Request, res: Response) => {
    await alertIntrusion("BRUTE-FORCE LOGIN", `⚠️ 10 tentatives de connexion dépassées — IP bloquée 24h`, req);
    res.status(429).json({ error: "Trop de tentatives de connexion. Réessayez dans 24 heures." });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Registration: 5 comptes / 24h per IP */
export const registerLimiter = rateLimit({
  windowMs: DAY_MS,
  max: 5,
  keyGenerator: getClientIp,
  handler: async (req: Request, res: Response) => {
    await alertIntrusion("ABUS INSCRIPTIONS", `⚠️ 5 inscriptions dépassées — IP bloquée 24h (bot probable)`, req);
    res.status(429).json({ error: "Trop d'inscriptions depuis cette adresse. Réessayez dans 24 heures." });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Admin login: 5 tentatives / 24h per IP */
export const adminLoginLimiter = rateLimit({
  windowMs: DAY_MS,
  max: 5,
  keyGenerator: getClientIp,
  handler: async (req: Request, res: Response) => {
    await alertIntrusion(
      "BRUTE-FORCE ADMIN LOGIN",
      `⚠️ 5 tentatives admin dépassées — IP bloquée 24h`,
      req
    );
    res.status(429).json({ error: "Trop de tentatives admin. Accès bloqué 24 heures." });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** OTP verify: 5 essais / 24h per IP */
export const otpLimiter = rateLimit({
  windowMs: DAY_MS,
  max: 5,
  keyGenerator: getClientIp,
  handler: async (req: Request, res: Response) => {
    await alertIntrusion(
      "BRUTE-FORCE OTP",
      `⚠️ 5 tentatives OTP dépassées — IP bloquée 24h`,
      req
    );
    res.status(429).json({ error: "Trop de tentatives OTP. Réessayez dans 24 heures." });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Confirmation de retrait: 5 essais / 24h per IP (code secret statique) */
export const withdrawalConfirmLimiter = rateLimit({
  windowMs: DAY_MS,
  max: 5,
  keyGenerator: getClientIp,
  handler: async (req: Request, res: Response) => {
    await alertIntrusion(
      "BRUTE-FORCE CODE RETRAIT",
      `⚠️ 5 tentatives de code de confirmation de retrait dépassées — IP bloquée 24h`,
      req
    );
    res.status(429).json({ error: "Trop de tentatives. Réessayez dans 24 heures." });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** API générale: 200 req / min per IP (anti-bot/scan), IP suspecte 24h */
export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  keyGenerator: getClientIp,
  handler: async (req: Request, res: Response) => {
    await alertIntrusion(
      "RATE LIMIT GLOBAL",
      `⚠️ Plus de 200 requêtes/min détectées (scan/bot probable)`,
      req
    );
    res.status(429).json({ error: "Trop de requêtes. Ralentissez." });
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
      `👤 Identifiant: <code>${identifier.slice(0, 40)}</code>\n` +
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
