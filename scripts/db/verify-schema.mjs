// Spec 0002 verification probes: structure, checks, dedupe, cascade, snapshot.
// Uses its own temp student so seed data stays intact. Rerunnable.
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const results = [];
const ok = (name, pass, detail = "") =>
  results.push(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);

// Clean slate for probe data (rerunnable).
await sql`DELETE FROM students WHERE id = 'user_verify_probe'`;

// AC-1: all eleven tables
const tables = (
  await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
  `
).map((t) => t.table_name);
const expected = [
  "students",
  "modules",
  "lectures",
  "lecture_chunks",
  "flashcards",
  "review_logs",
  "quiz_questions",
  "exam_attempts",
  "exam_attempt_questions",
  "usage_events",
  "chat_messages",
];
ok(
  "AC-1 eleven tables",
  expected.every((t) => tables.includes(t)),
  tables.length + " tables found",
);

// Probe student
await sql`
  INSERT INTO students (id, email)
  VALUES ('user_verify_probe', 'probe@pcem-study.tn')
  ON CONFLICT (id) DO NOTHING
`;

// AC-2 shape: options CHECK rejects 3 options
const [lec] = await sql`
  INSERT INTO modules (student_id, semester, name, position)
  VALUES ('user_verify_probe', 'P1S1', 'ProbeModule', 1)
  RETURNING id
`;
await sql`
  INSERT INTO lectures (student_id, module_id, title, storage_path)
  VALUES ('user_verify_probe', ${lec.id}, 'Probe lecture', 'lectures/probe.pdf')
`;
let checkRejected = false;
try {
  await sql`
    INSERT INTO quiz_questions (lecture_id, prompt, options, correct_index, position)
    VALUES (
      (SELECT id FROM lectures WHERE storage_path = 'lectures/probe.pdf'),
      'probe?', ${sql.json(["a", "b", "c"])}, 0, 1
    )
  `;
} catch {
  checkRejected = true;
}
ok("AC-2 options CHECK", checkRejected);

// AC-10 dedupe: second same-day review of one card violates the unique key
const [card] = await sql`
  INSERT INTO flashcards (student_id, lecture_id, front, back, position)
  VALUES (
    'user_verify_probe',
    (SELECT id FROM lectures WHERE storage_path = 'lectures/probe.pdf'),
    'q', 'a', 1
  )
  RETURNING id
`;
await sql`
  INSERT INTO review_logs (student_id, flashcard_id, grade)
  VALUES ('user_verify_probe', ${card.id}, 'good')
`;
let dedupeHeld = false;
try {
  await sql`
    INSERT INTO review_logs (student_id, flashcard_id, grade)
    VALUES ('user_verify_probe', ${card.id}, 'again')
  `;
} catch {
  dedupeHeld = true;
}
ok("AC-10 same-day dedupe", dedupeHeld);

// AC-9 snapshot survives question deletion
const [q] = await sql`
  INSERT INTO quiz_questions (lecture_id, prompt, options, correct_index, position)
  VALUES (
    (SELECT id FROM lectures WHERE storage_path = 'lectures/probe.pdf'),
    'probe?', ${sql.json(["a", "b", "c", "d"])}, 1, 1
  )
  RETURNING id
`;
const [attempt] = await sql`
  INSERT INTO exam_attempts (student_id) VALUES ('user_verify_probe') RETURNING id
`;
await sql`
  INSERT INTO exam_attempt_questions (attempt_id, question_id, snapshot, chosen_index, is_correct)
  VALUES (
    ${attempt.id}, ${q.id},
    ${sql.json({ prompt: "probe?", options: ["a", "b", "c", "d"], correct_index: 1, explanation: null })},
    1, true
  )
`;
await sql`DELETE FROM quiz_questions WHERE id = ${q.id}`;
const [survivor] = await sql`
  SELECT snapshot, question_id FROM exam_attempt_questions WHERE attempt_id = ${attempt.id}
`;
ok(
  "AC-9 snapshot survives question delete",
  Boolean(survivor?.snapshot?.prompt) && survivor.question_id === null,
);

// AC-3 cascade: deleting the probe student removes everything
await sql`DELETE FROM students WHERE id = 'user_verify_probe'`;
const orphans = await sql`
  SELECT
    (SELECT count(*) FROM modules WHERE name = 'ProbeModule') AS m,
    (SELECT count(*) FROM lectures WHERE storage_path = 'lectures/probe.pdf') AS l,
    (SELECT count(*) FROM exam_attempts WHERE student_id = 'user_verify_probe') AS a
`;
ok(
  "AC-3 cascade leaves no orphans",
  Number(orphans[0].m) === 0 && Number(orphans[0].l) === 0 && Number(orphans[0].a) === 0,
);

// AC-8 quota count query (day bounds from a timezone)
const [quota] = await sql`
  SELECT count(*)::int AS n FROM usage_events
  WHERE student_id = 'user_demo_seed'
    AND kind = 'lecture_upload'
    AND created_at >= (now() AT TIME ZONE 'Africa/Tunis')::date::timestamp AT TIME ZONE 'Africa/Tunis'
`;
ok("AC-8 quota count query", Number.isInteger(quota?.n), "count = " + quota?.n);

console.log(results.join("\n"));
await sql.end();
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
