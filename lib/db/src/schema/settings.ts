import { pgTable, serial, text, numeric, boolean } from "drizzle-orm/pg-core";

export const siteSettingsTable = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  supportEmail: text("support_email").notNull().default("support@nexarix.com"),
  telegramLink: text("telegram_link").notNull().default("https://t.me/nexarix"),
  telegramChannel: text("telegram_channel"),
  whatsappLink: text("whatsapp_link").notNull().default("https://wa.me/nexarix"),
  vcfLink: text("vcf_link"),
  activationFee: numeric("activation_fee", { precision: 12, scale: 2 }).notNull().default("3000"),
  minWithdrawal: numeric("min_withdrawal", { precision: 12, scale: 2 }).notNull().default("3000"),
  paymentMode: text("payment_mode").notNull().default("manual"),
  sendavapayApiKey: text("sendavapay_api_key"),
  sendavapayWebhookSecret: text("sendavapay_webhook_secret"),
  appBaseUrl: text("app_base_url"),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
});

export type SiteSettings = typeof siteSettingsTable.$inferSelect;
