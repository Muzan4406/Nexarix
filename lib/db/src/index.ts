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
    // Direct connection (no pooler) — most compatible with all hosting providers.
    return `postgresql://postgres:${encodedPass}@db.${ref}.supabase.co:5432/postgres?sslmode=require`;
  }
  const url = process.env.DATABASE_URL;
  if (url) return url;
  throw new Error("SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD or DATABASE_URL must be set.");
}

export const pool = new Pool({
  connectionString: getConnectionString(),
  ssl: { rejectUnauthorized: false },
});
export const db = drizzle(pool, { schema });

export * from "./schema";
