// Spec 0002 migration — hand-written DDL executed via the socket route.
// Mirrors src/db/schema.ts exactly (names, constraints, defaults).
// Idempotent: IF NOT EXISTS / guarded constraint adds, safe to rerun.
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

// ── enums ──
for (const [name, values] of [
  ["lecture_state", ["uploaded", "processing", "ready", "failed"]],
  ["chunk_status", ["pending", "processing", "done", "failed"]],
  ["review_grade", ["again", "hard", "good", "easy"]],
  ["usage_kind", ["lecture_upload", "chunk_generation", "chat_message", "exam_generation"]],
  ["chat_role", ["user", "assistant"]],
]) {
  await sql.unsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN
        CREATE TYPE ${name} AS ENUM (${values.map((v) => `'${v}'`).join(", ")});
      END IF;
    END $$;
  `);
}

// ── students (upgrade the pipe-proof table in place) ──
await sql.unsafe(`
  ALTER TABLE students ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Tunis';
`);
await sql.unsafe(`
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_email_key') THEN
      ALTER TABLE students ADD CONSTRAINT students_email_key UNIQUE (email);
    END IF;
  END $$;
`);

// ── modules ──
await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    semester text NOT NULL,
    name text NOT NULL,
    position integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT modules_student_name_key UNIQUE (student_id, name),
    CONSTRAINT modules_semester_check CHECK (semester IN ('P1S1', 'P1S2', 'P2S1', 'P2S2'))
  );
`);

// ── lectures ──
await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS lectures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title text NOT NULL,
    storage_path text NOT NULL,
    file_name text,
    file_size_bytes integer,
    page_count integer,
    processing_state lecture_state NOT NULL DEFAULT 'uploaded',
    total_chunks integer NOT NULL DEFAULT 0,
    processed_chunks integer NOT NULL DEFAULT 0,
    summary jsonb,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT lectures_student_storage_key UNIQUE (student_id, storage_path)
  );
`);
await sql.unsafe(`CREATE INDEX IF NOT EXISTS lectures_student_idx ON lectures (student_id);`);
await sql.unsafe(`CREATE INDEX IF NOT EXISTS lectures_module_idx ON lectures (module_id);`);

// ── lecture_chunks ──
await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS lecture_chunks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    chunk_index integer NOT NULL,
    page_start integer,
    page_end integer,
    status chunk_status NOT NULL DEFAULT 'pending',
    extracted_text text,
    output jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT lecture_chunks_lecture_index_key UNIQUE (lecture_id, chunk_index)
  );
`);
await sql.unsafe(
  `CREATE INDEX IF NOT EXISTS lecture_chunks_lecture_idx ON lecture_chunks (lecture_id);`,
);

// ── flashcards ──
await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS flashcards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    front text NOT NULL,
    back text NOT NULL,
    position integer NOT NULL,
    ease real NOT NULL DEFAULT 2.5,
    interval_days integer NOT NULL DEFAULT 0,
    due_at timestamptz NOT NULL DEFAULT now(),
    lapses integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT flashcards_lecture_position_key UNIQUE (lecture_id, position)
  );
`);
await sql.unsafe(`CREATE INDEX IF NOT EXISTS flashcards_lecture_idx ON flashcards (lecture_id);`);
await sql.unsafe(
  `CREATE INDEX IF NOT EXISTS flashcards_student_due_idx ON flashcards (student_id, due_at);`,
);

// ── review_logs ──
await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS review_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    flashcard_id uuid NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    grade review_grade NOT NULL,
    reviewed_at timestamptz NOT NULL DEFAULT now(),
    reviewed_day date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Tunis')::date,
    CONSTRAINT review_logs_student_card_day_key UNIQUE (student_id, flashcard_id, reviewed_day)
  );
`);
await sql.unsafe(
  `CREATE INDEX IF NOT EXISTS review_logs_student_day_idx ON review_logs (student_id, reviewed_day);`,
);

// ── quiz_questions ──
await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS quiz_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    prompt text NOT NULL,
    options jsonb NOT NULL,
    correct_index integer NOT NULL,
    explanation text,
    position integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT quiz_questions_lecture_position_key UNIQUE (lecture_id, position),
    CONSTRAINT quiz_questions_options_check CHECK (jsonb_array_length(options) = 4)
  );
`);
await sql.unsafe(
  `CREATE INDEX IF NOT EXISTS quiz_questions_lecture_idx ON quiz_questions (lecture_id);`,
);

// ── exam_attempts ──
await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS exam_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    time_taken_seconds integer,
    score real
  );
`);
await sql.unsafe(
  `CREATE INDEX IF NOT EXISTS exam_attempts_student_started_idx ON exam_attempts (student_id, started_at);`,
);

// ── exam_attempt_questions ──
await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS exam_attempt_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id uuid NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id uuid REFERENCES quiz_questions(id) ON DELETE SET NULL,
    snapshot jsonb NOT NULL,
    chosen_index integer,
    is_correct boolean,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT exam_attempt_questions_attempt_question_key UNIQUE (attempt_id, question_id)
  );
`);

// ── usage_events ──
await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS usage_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    kind usage_kind NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
`);
await sql.unsafe(
  `CREATE INDEX IF NOT EXISTS usage_events_student_created_idx ON usage_events (student_id, created_at);`,
);

// ── chat_messages ──
await sql.unsafe(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id text NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    role chat_role NOT NULL,
    content text NOT NULL,
    cited_chunk_ids jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );
`);
await sql.unsafe(
  `CREATE INDEX IF NOT EXISTS chat_messages_lecture_created_idx ON chat_messages (lecture_id, created_at);`,
);

const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name
`;
console.log("TABLES:", tables.map((t) => t.table_name).join(", "));
await sql.end();
