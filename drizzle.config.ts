import { defineConfig } from "drizzle-kit";

// Run via the db:* scripts in package.json — they load .env.local
// through node --env-file, so nothing here reads the URL directly.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Pooled connection (port 6543) — required for serverless deploys.
    url: process.env.DATABASE_URL!,
  },
});
