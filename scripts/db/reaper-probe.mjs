// Plant a stuck lecture (processing, zero progress, older than the reaper
// threshold) to exercise the reaper on read at runtime.
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
const id = "22222222-2222-4222-8222-222222222222";
await sql`delete from lectures where id = ${id}`;
await sql`
  insert into lectures (id, student_id, module_id, title, storage_path, processing_state, total_chunks, processed_chunks, updated_at, created_at)
  select ${id}, student_id, module_id, 'Reaper probe', 'reaper-probe/never.pdf', 'processing', 2, 0,
         now() - interval '11 minutes', now() - interval '12 minutes'
  from lectures where id = '11111111-1111-4111-8111-111111111111'
`;
console.log("stuck lecture planted");
await sql.end();
