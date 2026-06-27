import { defineConfig } from "drizzle-kit";
import path from "path";

function getConnectionString(): string {
  const ref = process.env.SUPABASE_PROJECT_REF;
  const pass = process.env.SUPABASE_DB_PASSWORD;
  if (!ref || !pass) {
    throw new Error("SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD must be set.");
  }
  return `postgresql://postgres.${ref}:${pass}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: getConnectionString(),
  },
});
