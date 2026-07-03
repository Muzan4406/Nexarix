import { db } from "@workspace/db";
import { blockedIpsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlockEntry {
  reason: string;
  country?: string;
  type?: string;
  path?: string;
  blockedAt: Date;
  manual: boolean;
}

// ─── In-memory store (populated from DB on startup) ───────────────────────────

export const blockedIps = new Map<string, BlockEntry>();

export function isBlocked(ip: string): boolean {
  return blockedIps.has(ip);
}

/** Block an IP in memory + persist to DB */
export async function blockIp(
  ip: string,
  reason: string,
  country?: string,
  type?: string,
  path?: string,
  manual = false,
): Promise<void> {
  const entry: BlockEntry = { reason, country, type, path, blockedAt: new Date(), manual };
  blockedIps.set(ip, entry);

  try {
    await db.insert(blockedIpsTable)
      .values({ ip, reason, country, type, path, manual })
      .onConflictDoUpdate({
        target: blockedIpsTable.ip,
        set: { reason, country, type, path, manual },
      });
  } catch {
    // DB write failure — still blocked in memory
  }
}

/** Unblock an IP in memory + remove from DB */
export async function unblockIp(ip: string): Promise<boolean> {
  const existed = blockedIps.delete(ip);
  try {
    await db.delete(blockedIpsTable).where(eq(blockedIpsTable.ip, ip));
  } catch {
    // ignore
  }
  return existed;
}

export function listBlocked(): Array<BlockEntry & { ip: string }> {
  return Array.from(blockedIps.entries()).map(([ip, e]) => ({ ip, ...e }));
}

/** Load all persisted blocked IPs from DB into memory — call once at startup */
export async function loadBlockedIpsFromDb(): Promise<void> {
  try {
    const rows = await db.select().from(blockedIpsTable);
    for (const row of rows) {
      blockedIps.set(row.ip, {
        reason: row.reason,
        country: row.country ?? undefined,
        type: row.type ?? undefined,
        path: row.path ?? undefined,
        blockedAt: row.blockedAt ?? new Date(),
        manual: row.manual ?? false,
      });
    }
  } catch {
    // DB unavailable — start with empty in-memory store
  }
}
