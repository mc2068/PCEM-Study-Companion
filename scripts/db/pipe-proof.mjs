// Pipe-proof: connect to Supabase Postgres and create the first table.
// Pure socket I/O (postgres package) — no child processes, sandbox-safe.
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

await sql`
  CREATE TABLE IF NOT EXISTS students (
    id text PRIMARY KEY,
    email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )
`;

const info = await sql`
  SELECT current_database() AS db, count(*)::int AS students
  FROM information_schema.tables t, students s
  WHERE t.table_name = 'students' AND t.table_schema = 'public'
`;

console.log("CONNECTED:", JSON.stringify(info[0]));
await sql.end();
