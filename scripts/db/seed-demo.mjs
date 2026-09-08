// Spec 0002 seed — demo student + one Semester 1 module. Idempotent.
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const DEMO_ID = "user_demo_seed";

await sql`
  INSERT INTO students (id, email)
  VALUES (${DEMO_ID}, 'demo@pcem-study.tn')
  ON CONFLICT (id) DO NOTHING
`;

await sql`
  INSERT INTO modules (student_id, semester, name, position)
  VALUES (${DEMO_ID}, 'P1S1', 'Anatomie', 1)
  ON CONFLICT (student_id, name) DO NOTHING
`;

const [row] = await sql`
  SELECT
    (SELECT count(*) FROM students WHERE id = ${DEMO_ID}) AS student,
    (SELECT count(*) FROM modules WHERE student_id = ${DEMO_ID}) AS modules
`;
console.log("SEED:", JSON.stringify(row));
await sql.end();
