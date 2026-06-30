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
  const url = process.env.DATABASE_URL;
  if (url) return url;
  throw new Error("SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD or DATABASE_URL must be set.");
}

export const pool = new Pool({ connectionString: getConnectionString() });
export const db = drizzle(pool, { schema });

export * from "./schema";
