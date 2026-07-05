import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function getConnectionString(): string {
  const ref = process.env.SUPABASE_PROJECT_REF;
  const pass = process.env.SUPABASE_DB_PASSWORD;
  if (ref && pass) {
    // URL-encode the password to handle special chars like @, #, %, etc.
    const encodedPass = encodeURIComponent(pass);
    // Transaction pooler — sslmode omitted from URL so the ssl config in Pool takes effect.
    return `postgresql://postgres.${ref}:${encodedPass}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;
  }
  const url = process.env.DATABASE_URL;
  if (url) return url;
  throw new Error("SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD or DATABASE_URL must be set.");
}

export const pool = new Pool({
  connectionString: getConnectionString(),
  ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Warmup: establish a connection on startup so the first user request doesn't wait
pool.connect().then((client) => client.release()).catch(() => {});

// Keep-alive: ping every 4 minutes to prevent idle connection drops
setInterval(() => {
  pool.query("SELECT 1").catch(() => {});
}, 4 * 60 * 1000);

export const db = drizzle(pool, { schema });

export * from "./schema";
