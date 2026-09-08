// Check the over-ceiling refusal result (AC-2).
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
  await sql`select processing_state, error_message, page_count, total_chunks from lectures where id = '33333333-3333-4333-8333-333333333333'`;
console.log("LECTURE", JSON.stringify(row));
const [chunks] =
  await sql`select count(*)::int as n from lecture_chunks where lecture_id = '33333333-3333-4333-8333-333333333333'`;
console.log("CHUNK ROWS", chunks.n);
await sql.end();
