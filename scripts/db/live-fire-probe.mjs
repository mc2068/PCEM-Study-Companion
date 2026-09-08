// Live-fire probe (spec 0004 AC-11): insert a processing lecture row for the
// PDF already stored, then the caller publishes the QStash prepare job.
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
const studentId = "user_3J2uwX4pdEwsAVEgWO1J3CoTnN3";
const lectureId = "11111111-1111-4111-8111-111111111111";

// student + default module (mirrors ensureStudent/ensureDefaultModule)
await sql`
  insert into students (id, email) values (${studentId}, 'pcem-dev@example.com')
  on conflict (id) do nothing
`;
await sql`
  insert into modules (student_id, semester, name, position)
  values (${studentId}, 'P1S1', 'Cours généraux', 1)
  on conflict (student_id, name) do nothing
`;
const mods =
  await sql`select id from modules where student_id = ${studentId} order by position limit 1`;
if (mods.length === 0) {
  console.log("NO-MODULE: visit the home page once first to provision the student");
  process.exit(1);
}

await sql`
  insert into lectures (id, student_id, module_id, title, storage_path, file_name, file_size_bytes, processing_state)
  values (${lectureId}, ${studentId}, ${mods[0].id}, 'Sonde anatomie du coeur', ${studentId + "/test-presign-probe.pdf"}, 'test-presign-probe.pdf', 1467, 'processing')
  on conflict (id) do update set processing_state = 'processing', error_message = null, processed_chunks = 0, total_chunks = 0, summary = null, updated_at = now()
`;
await sql`delete from lecture_chunks where lecture_id = ${lectureId}`;
await sql`delete from flashcards where lecture_id = ${lectureId}`;
await sql`delete from quiz_questions where lecture_id = ${lectureId}`;

console.log("LECTURE-READY", lectureId);
await sql.end();
