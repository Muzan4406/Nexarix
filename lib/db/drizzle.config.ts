import { defineConfig } from "drizzle-kit";
import path from "path";

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  throw new Error("DATABASE_URL must be set.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: getConnectionString(),
  },
});
