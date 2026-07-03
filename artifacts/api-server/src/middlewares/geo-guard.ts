import { type Request, type Response, type NextFunction } from "express";
import { blockedIps, blockIp } from "../lib/ip-block";
import { sendTelegramNotification } from "../lib/telegram";

// ─── Config ───────────────────────────────────────────────────────────────────

// ISO 3166-1 alpha-2 codes as returned by ip-api.com
const ALLOWED_COUNTRIES = new Set([
  "TG", "BJ", "CI", "CM", "BF", "ML", "NE", "SN", "GN",
  "GA", "TD", "CG", "CF", "GQ", "CD",
]);

const COUNTRY_NAME: Record<string, string> = {
  TG: "Togo", BJ: "Bénin", CI: "Côte d'Ivoire", CM: "Cameroun",
  BF: "Burkina Faso", ML: "Mali", NE: "Niger", SN: "Sénégal",
  GN: "Guinée", GA: "Gabon", TD: "Tchad", CG: "Congo",
  CF: "Centrafrique", GQ: "Guinée Éq.", CD: "RD Congo",
};

// Routes entirely bypassed (Telegram webhook must always reach us)
const BYPASS_PREFIXES = ["/telegram/", "/health", "/settings/public"];

// Only check sensitive routes — skip static, health, public endpoints
const SENSITIVE_RE = /\/(auth|activate|admin|withdraw|store|formations|tasks|upload|services)/;

// ip-api.com geo cache — 1 h TTL per IP
interface GeoInfo {
  countryCode: string;
  country: string;
  proxy: boolean;
  hosting: boolean;
  isp: string;
  cachedAt: number;
}
const geoCache = new Map<string, GeoInfo>();

// ─── IP helpers ───────────────────────────────────────────────────────────────

function normaliseIp(raw: string): string {
  return raw.startsWith("::ffff:") ? raw.slice(7) : raw;
}

function isPrivateIp(ip: string): boolean {
  const n = normaliseIp(ip);
  if (n === "127.0.0.1" || n === "::1") return true;
  if (n.startsWith("10.")) return true;
  if (n.startsWith("192.168.")) return true;
  // RFC-1918: 172.16.0.0/12 → 172.16–172.31
  const m = n.match(/^172\.(\d+)\./);
  if (m) {
    const b = parseInt(m[1], 10);
    if (b >= 16 && b <= 31) return true;
  }
  return false;
}

export function extractIp(req: Request): string {
  return normaliseIp(req.ip ?? req.socket?.remoteAddress ?? "unknown");
}

// ─── Geo lookup ───────────────────────────────────────────────────────────────

async function lookupGeo(ip: string): Promise<GeoInfo | null> {
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.cachedAt < 3_600_000) return cached;

  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,proxy,hosting,isp`,
      { signal: AbortSignal.timeout(3000) },
    );
    const data = (await res.json()) as any;
    if (data.status === "success") {
      const info: GeoInfo = {
        countryCode: data.countryCode ?? "",
        country: data.country ?? "",
        proxy: Boolean(data.proxy),
        hosting: Boolean(data.hosting),
        isp: data.isp ?? "",
        cachedAt: Date.now(),
      };
      geoCache.set(ip, info);
      return info;
    }
  } catch {
    // Geo lookup timeout / network error → fail open
  }
  return null;
}

// ─── Alert format (matches user-requested style) ──────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Africa/Abidjan",
  }).replace(",", "");
}

function buildAlert(ip: string, geo: GeoInfo | null, type: string, path: string): string {
  // Title uses slashes without spaces to match requested format (VPN/PROXY)
  const titleType = type.replace(/ \/ /g, "/");
  const country = geo?.countryCode || "Inconnu";
  const now = formatDate(new Date());

  return (
    `🔍 <b>${titleType} BLOQUÉ AUTOMATIQUEMENT</b>\n\n` +
    `IP: <code>${ip}</code>\n` +
    `Pays: ${country}\n` +
    `Type: ${type}\n` +
    `Chemin: ${path}\n` +
    `Date: ${now}\n\n` +
    `L'IP a été bloquée définitivement en base de données.`
  );
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function geoGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = extractIp(req);
  const path = req.path;

  // Always allow private / loopback
  if (isPrivateIp(ip) || ip === "unknown") return next();

  // Allow Telegram webhook and fully public endpoints
  if (BYPASS_PREFIXES.some((p) => path.startsWith(p))) return next();

  // Only check sensitive routes
  if (!SENSITIVE_RE.test(path)) return next();

  // Fast-path: already blocked
  if (blockedIps.has(ip)) {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  const geo = await lookupGeo(ip);

  // Determine block reason
  let blockType: string | null = null;
  let reason = "";

  if (geo) {
    const countryAllowed = ALLOWED_COUNTRIES.has(geo.countryCode);

    if (geo.proxy) {
      // Proxy/VPN is always blocked regardless of country
      blockType = geo.hosting
        ? "VPN / Proxy / Hébergeur"
        : "VPN / Proxy";
      reason = `Proxy/VPN détecté (${geo.isp})`;
    } else if (geo.hosting && !countryAllowed) {
      // Hosting IPs from foreign countries are blocked.
      // Hosting IPs from allowed countries are let through —
      // many African mobile operators are flagged as "hosting".
      blockType = "VPN / Hébergeur";
      reason = `IP hébergeur hors zone (${geo.isp}, ${geo.countryCode})`;
    } else if (!countryAllowed && geo.countryCode) {
      blockType = "Pays non autorisé";
      reason = `Pays: ${geo.countryCode}`;
    }
  }

  if (blockType) {
    // Persist + alert (fire-and-forget — don't block the response)
    blockIp(ip, reason, geo?.countryCode, blockType, path, false).catch(() => {});
    sendTelegramNotification(buildAlert(ip, geo, blockType, path));

    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  next();
}
