// Dump live DDL for the 11 spec-0002 tables: columns, constraints, indexes.
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const tables = [
  "students", "modules", "lectures", "lecture_chunks", "flashcards",
  "review_logs", "quiz_questions", "exam_attempts", "exam_attempt_questions",
  "usage_events", "chat_messages",
];

for (const t of tables) {
  console.log(`\n=== ${t} ===`);
  const cols = await sql.unsafe(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '${t}'
    ORDER BY ordinal_position
  `);
  for (const c of cols) {
    console.log(
      `  col ${c.column_name} ${c.udt_name}${c.is_nullable === "NO" ? " NOT NULL" : ""}` +
      (c.column_default ? ` DEFAULT ${c.column_default}` : "")
    );
  }
  const cons = await sql.unsafe(`
    SELECT con.conname, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = con.connamespace
    WHERE rel.relname = '${t}' AND nsp.nspname = 'public'
    ORDER BY con.contype, con.conname
  `);
  for (const k of cons) console.log(`  ${k.conname}: ${k.def}`);
  const idx = await sql.unsafe(`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = '${t}' ORDER BY indexname
  `);
  for (const ix of idx) {
    if (!ix.indexname.endsWith("_pkey")) console.log(`  idx ${ix.indexdef}`);
  }
}

await sql.end();
