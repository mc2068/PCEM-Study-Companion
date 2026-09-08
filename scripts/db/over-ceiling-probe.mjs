// Plant an over-ceiling lecture: store the 65-page PDF and create its row
// in processing state, ready for a prepare delivery (AC-2 refusal proof).
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
const lectureId = "33333333-3333-4333-8333-333333333333";
const storagePath = studentId + "/over-ceiling-probe.pdf";

// upload the PDF through a presigned URL, exactly like the browser does
const sign = await fetch(
  env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/upload/sign/lectures/" + storagePath,
  {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: 600 }),
  },
);
if (!sign.ok) {
  console.log("SIGN-FAILED", sign.status);
  process.exit(1);
}
const { url } = await sign.json();
const bytes = readFileSync(process.env.TEMP + "\\over-ceiling.pdf");
const put = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1" + url, {
  method: "PUT",
  headers: { "Content-Type": "application/pdf" },
  body: bytes,
});
console.log("PUT", put.status, bytes.length, "bytes");

await sql`
  insert into lectures (id, student_id, module_id, title, storage_path, file_name, file_size_bytes, processing_state)
  values (${lectureId}, ${studentId}, (select id from modules where student_id = ${studentId} order by position limit 1),
          'Sonde plafond 65 pages', ${storagePath}, 'over-ceiling-probe.pdf', ${bytes.length}, 'processing')
  on conflict (id) do update set processing_state = 'processing', error_message = null,
    total_chunks = 0, processed_chunks = 0, summary = null, updated_at = now()
`;
await sql`delete from lecture_chunks where lecture_id = ${lectureId}`;
console.log("LECTURE-READY", lectureId);
await sql.end();
