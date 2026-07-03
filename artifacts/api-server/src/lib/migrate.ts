import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export async function runStartupMigrations(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_otp_sessions (
        session_token TEXT PRIMARY KEY,
        otp TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        is_admin INTEGER NOT NULL DEFAULT 1,
        expires_at BIGINT NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        link_url TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS formation_purchases (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        formation_id INTEGER NOT NULL,
        amount NUMERIC(10, 2),
        status TEXT NOT NULL DEFAULT 'pending',
        sendavapay_reference TEXT,
        payment_token TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS blocked_ips (
        ip TEXT PRIMARY KEY,
        reason TEXT NOT NULL,
        country TEXT,
        type TEXT,
        path TEXT,
        blocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
        manual BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

    logger.info("Startup migrations OK");
  } catch (err) {
    logger.error({ err }, "Startup migrations failed");
  }
}
