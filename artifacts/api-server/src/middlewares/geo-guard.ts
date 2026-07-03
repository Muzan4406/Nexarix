import { type Request, type Response, type NextFunction } from "express";
import { blockedIps, geoCache, blockIp } from "../lib/ip-block";
import { sendTelegramNotification } from "../lib/telegram";

// ISO 3166-1 alpha-2 codes as returned by ip-api.com
// Matches countries defined in activation.ts (COG→CG, COD→CD)
const ALLOWED_COUNTRIES = new Set([
  "TG", "BJ", "CI", "CM", "BF", "ML", "NE", "SN", "GN",
  "GA", "TD", "CG", "CF", "GQ", "CD",
]);

// Country code → display name for Telegram alerts
const COUNTRY_NAME: Record<string, string> = {
  TG: "Togo", BJ: "Bénin", CI: "Côte d'Ivoire", CM: "Cameroun",
  BF: "Burkina Faso", ML: "Mali", NE: "Niger", SN: "Sénégal",
  GN: "Guinée", GA: "Gabon", TD: "Tchad", CG: "Congo",
  CF: "Centrafrique", GQ: "Guinée Éq.", CD: "RD Congo",
};

// Routes that bypass geo check entirely
const BYPASS_PREFIXES = [
  "/telegram/", "/health", "/settings/public",
];

// Routes that trigger geo check
const SENSITIVE_RE = /\/(auth|activate|admin|withdraw|store|formations|tasks|upload|services)/;

/** Normalise IPv6-mapped IPv4 (::ffff:1.2.3.4 → 1.2.3.4) */
function normaliseIp(raw: string): string {
  return raw.startsWith("::ffff:") ? raw.slice(7) : raw;
}

/** RFC-1918 + loopback only — 172.16/12 not the full 172.* block */
function isPrivateIp(ip: string): boolean {
  const n = normaliseIp(ip);
  if (n === "127.0.0.1" || n === "::1") return true;
  if (n.startsWith("10.")) return true;
  if (n.startsWith("192.168.")) return true;
  // 172.16.0.0/12 → 172.16.x.x – 172.31.x.x
  const m = n.match(/^172\.(\d+)\./);
  if (m) {
    const b = parseInt(m[1], 10);
    if (b >= 16 && b <= 31) return true;
  }
  return false;
}

/** Use Express req.ip (honours trust proxy) then fall back to socket address. */
export function extractIp(req: Request): string {
  const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
  return normaliseIp(ip);
}

async function lookupCountry(ip: string): Promise<string | null> {
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.cachedAt < 3_600_000) return cached.countryCode;

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = (await res.json()) as any;
    if (data.status === "success" && data.countryCode) {
      geoCache.set(ip, { countryCode: data.countryCode, cachedAt: Date.now() });
      return data.countryCode;
    }
  } catch {
    // Geo lookup failed → fail open (don't block)
  }
  return null;
}

export async function geoGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = extractIp(req);

  // Always allow private / loopback
  if (isPrivateIp(ip) || ip === "unknown") return next();

  // Allow Telegram webhook and public endpoints
  const path = req.path; // path relative to /api mount
  if (BYPASS_PREFIXES.some((p) => path.startsWith(p))) return next();

  // Only check sensitive routes
  if (!SENSITIVE_RE.test(path)) return next();

  // Already blocked?
  const existing = blockedIps.get(ip);
  if (existing) {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  const countryCode = await lookupCountry(ip);

  if (countryCode && !ALLOWED_COUNTRIES.has(countryCode)) {
    blockIp(ip, `Pays non autorisé: ${countryCode}`, countryCode, false);

    const countryLabel = COUNTRY_NAME[countryCode] ?? countryCode;
    sendTelegramNotification(
      `🚫 <b>IP bloquée automatiquement</b>\n` +
      `🌍 Pays: <b>${countryLabel} (${countryCode})</b>\n` +
      `🔌 IP: <code>${ip}</code>\n` +
      `📍 Route: <code>${req.method} ${path}</code>`,
    );

    res.status(403).json({ error: "Service non disponible dans votre région" });
    return;
  }

  next();
}
