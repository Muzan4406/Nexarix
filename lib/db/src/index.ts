import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function getConnectionString(): string {
  const ref = process.env.SUPABASE_PROJECT_REF;
  const pass = process.env.SUPABASE_DB_PASSWORD;
  if (ref && pass) {
    return `postgresql://postgres.${ref}:${pass}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;
  }
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  throw new Error("No database connection configured. Set SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD or DATABASE_URL.");
}

export const pool = new Pool({ connectionString: getConnectionString() });
export const db = drizzle(pool, { schema });

export * from "./schema";
