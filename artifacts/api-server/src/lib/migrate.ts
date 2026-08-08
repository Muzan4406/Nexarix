import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { logger } from "./logger";
import bcrypt from "bcryptjs";

async function ensureAdminUser(): Promise<void> {
  const email = process.env.ADMIN_EMAIL ?? "";
  const username = process.env.ADMIN_USERNAME ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || !password) return;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const passwordHash = await bcrypt.hash(password, 10);

  if (!existing) {
    await db.insert(usersTable).values({
      username: username || "admin",
      email,
      phone: "0000000000",
      country: "Togo",
      passwordHash,
      status: "active",
      membership: "Premium",
      isAdmin: true,
    });
    logger.info("Admin user created");
  } else if (!existing.isAdmin) {
    // Promote to admin if not already
    await db.update(usersTable).set({ isAdmin: true, passwordHash }).where(eq(usersTable.email, email));
    logger.info("Admin user promoted");
  } else {
    // Always sync password hash in case ADMIN_PASSWORD changed
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.email, email));
  }
}

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
      ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT false;
    `);


    await ensureAdminUser();
    logger.info("Startup migrations OK");
  } catch (err) {
    logger.error({ err }, "Startup migrations failed");
  }
}
