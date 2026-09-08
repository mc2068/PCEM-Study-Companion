// Verify stored shapes for AC-5: options length, correct index, summary shape.
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
const rows =
  await sql`select position, jsonb_array_length(options) as n, correct_index from quiz_questions where lecture_id = '11111111-1111-4111-8111-111111111111' order by position`;
console.log("QUESTIONS", JSON.stringify(rows));
const [sum] =
  await sql`select summary is not null as has_summary, jsonb_array_length(summary->'key_concepts') as concepts, length(summary->>'summary') as summary_len from lectures where id = '11111111-1111-4111-8111-111111111111'`;
console.log("SUMMARY", JSON.stringify(sum));
const [sm2] =
  await sql`select ease, interval_days, due_at <= now() as due_now, lapses from flashcards where lecture_id = '11111111-1111-4111-8111-111111111111' limit 1`;
console.log("CARD SM2 STATE", JSON.stringify(sm2));
await sql.end();
