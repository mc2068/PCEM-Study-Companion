import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Server-only database client (spec 0001 authorization model):
// the connection string never reaches client code.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Pooled connection — one client, reused across the server runtime.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export { schema };
