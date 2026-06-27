import { defineConfig } from "drizzle-kit";
import path from "path";

function getConnectionString(): string {
  const ref = process.env.SUPABASE_PROJECT_REF;
  const pass = process.env.SUPABASE_DB_PASSWORD;
  if (ref && pass) {
    return `postgresql://postgres.${ref}:${pass}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;
  }
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  throw new Error("No database connection configured.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: getConnectionString(),
  },
});
