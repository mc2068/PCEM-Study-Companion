// Check pipeline side effects for the live-fire lecture.
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
const id = "11111111-1111-4111-8111-111111111111";
const [lecture] =
  await sql`select processing_state, total_chunks, processed_chunks, error_message from lectures where id = ${id}`;
console.log("LECTURE", JSON.stringify(lecture));
const chunks =
  await sql`select chunk_index, page_start, page_end, status from lecture_chunks where lecture_id = ${id} order by chunk_index`;
console.log("CHUNKS", JSON.stringify(chunks));
const cards = await sql`select count(*)::int as n from flashcards where lecture_id = ${id}`;
const questions = await sql`select count(*)::int as n from quiz_questions where lecture_id = ${id}`;
console.log("CARDS", cards[0].n, "QUESTIONS", questions[0].n);
await sql.end();
