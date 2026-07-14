import { pgTable, text, bigint, serial } from "drizzle-orm/pg-core";

// IPs bloquées de façon permanente suite à une tentative d'intrusion/force brute.
// Le blocage survit aux redémarrages/redéploiements car il est stocké en base.
export const blockedIpsTable = pgTable("blocked_ips", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull().unique(),
  reason: text("reason").notNull(),
  blockedAt: bigint("blocked_at", { mode: "number" }).notNull(),
});
