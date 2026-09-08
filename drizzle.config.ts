import { defineConfig } from "drizzle-kit";

// Run via the db:* scripts in package.json — they load .env.local
// through node --env-file, so nothing here reads the URL directly.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Without this, drizzle-kit introspects Supabase's internal schemas
  // (auth, storage, ...) and crashes on their constraints — see
  // drizzle-team/drizzle-orm#5599. We only ever manage `public`.
  schemaFilter: ["public"],
  dbCredentials: {
    // Pooled connection (port 6543) — required for serverless deploys.
    url: process.env.DATABASE_URL!,
  },
});
