import { defineConfig } from "drizzle-kit";
import path from "path";

function getConnectionString(): string {
  const ref = process.env.SUPABASE_PROJECT_REF;
  const pass = process.env.SUPABASE_DB_PASSWORD;
  if (ref && pass) {
    return `postgresql://postgres.${ref}:${encodeURIComponent(pass)}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require`;
  }
  const url = process.env.DATABASE_URL;
  if (url) return url;
  throw new Error("SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD or DATABASE_URL must be set.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: getConnectionString(),
    ssl: { rejectUnauthorized: false },
  },
});
