import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const siteSettingsTable = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  supportEmail: text("support_email").notNull().default("support@nexarix.com"),
  telegramLink: text("telegram_link").notNull().default("https://t.me/nexarix"),
  whatsappLink: text("whatsapp_link").notNull().default("https://wa.me/nexarix"),
  vcfLink: text("vcf_link"),
});

export type SiteSettings = typeof siteSettingsTable.$inferSelect;
