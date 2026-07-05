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
    // Port 6543 = session pooler (compatible avec pg.Pool).
    // Port 5432 = transaction pooler (cause des déconnexions aléatoires avec pg.Pool).
    return `postgresql://postgres.${ref}:${encodedPass}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require`;
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
