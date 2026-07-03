// In-memory IP block store — shared between geo-guard middleware and Telegram commands

export interface BlockEntry {
  reason: string;
  country?: string;
  blockedAt: Date;
  manual: boolean;
}

// IP → block info
export const blockedIps = new Map<string, BlockEntry>();

// IP → { countryCode, cachedAt ms } — 1 h TTL
export const geoCache = new Map<string, { countryCode: string; cachedAt: number }>();

export function isBlocked(ip: string): boolean {
  return blockedIps.has(ip);
}

export function blockIp(ip: string, reason: string, country?: string, manual = false): void {
  blockedIps.set(ip, { reason, country, blockedAt: new Date(), manual });
}

export function unblockIp(ip: string): boolean {
  return blockedIps.delete(ip);
}

export function listBlocked(): Array<BlockEntry & { ip: string }> {
  return Array.from(blockedIps.entries()).map(([ip, e]) => ({ ip, ...e }));
}
