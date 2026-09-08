// Check the reaper outcome for the stuck probe lecture after a home read.
import { readFileSync } from "node:fs";
import postgres from "postgres";

const envText = readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
const sql = postgres(env.DATABASE_URL, { prepare: false });
const [row] =
  await sql`select title, processing_state, error_message from lectures where id = '22222222-2222-4222-8222-222222222222'`;
console.log("AFTER-HOME-READ", JSON.stringify(row));
await sql.end();
