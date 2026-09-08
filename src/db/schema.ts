import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ── Enums (spec 0002) ─────────────────────────────────────────────

export const lectureState = pgEnum("lecture_state", ["uploaded", "processing", "ready", "failed"]);

export const chunkStatus = pgEnum("chunk_status", ["pending", "processing", "done", "failed"]);

export const reviewGrade = pgEnum("review_grade", ["again", "hard", "good", "easy"]);

export const usageKind = pgEnum("usage_kind", [
  "lecture_upload",
  "chunk_generation",
  "chat_message",
  "exam_generation",
]);

export const chatRole = pgEnum("chat_role", ["user", "assistant"]);

// ── students ──────────────────────────────────────────────────────

export const students = pgTable(
  "students",
  {
    // Clerk user id — the single identity key across the whole app (spec 0001).
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    timezone: text("timezone").notNull().default("Africa/Tunis"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("students_email_key").on(t.email)],
);

// ── modules ───────────────────────────────────────────────────────

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    semester: text("semester").notNull(),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("modules_student_name_key").on(t.studentId, t.name),
    check("modules_semester_check", sql`${t.semester} IN ('P1S1', 'P1S2', 'P2S1', 'P2S2')`),
  ],
);

// ── lectures ──────────────────────────────────────────────────────

export const lectures = pgTable(
  "lectures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    storagePath: text("storage_path").notNull(),
    fileName: text("file_name"),
    fileSizeBytes: integer("file_size_bytes"),
    pageCount: integer("page_count"),
    processingState: lectureState("processing_state").notNull().default("uploaded"),
    totalChunks: integer("total_chunks").notNull().default(0),
    processedChunks: integer("processed_chunks").notNull().default(0),
    // Zod shape (application code): { summary: string, key_concepts: string[] }
    summary: jsonb("summary"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("lectures_student_storage_key").on(t.studentId, t.storagePath),
    index("lectures_student_idx").on(t.studentId),
    index("lectures_module_idx").on(t.moduleId),
  ],
);

// ── lecture_chunks ────────────────────────────────────────────────

export const lectureChunks = pgTable(
  "lecture_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lectureId: uuid("lecture_id")
      .notNull()
      .references(() => lectures.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    pageStart: integer("page_start"),
    pageEnd: integer("page_end"),
    status: chunkStatus("status").notNull().default("pending"),
    extractedText: text("extracted_text"),
    // Per chunk Zod payload (merge and retry cache):
    // { summaryFragment, flashcards[], questions[] }
    output: jsonb("output"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("lecture_chunks_lecture_index_key").on(t.lectureId, t.chunkIndex),
    index("lecture_chunks_lecture_idx").on(t.lectureId),
  ],
);

// ── flashcards ────────────────────────────────────────────────────

export const flashcards = pgTable(
  "flashcards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Denormalized from lecture for the daily due query (spec 0002).
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    lectureId: uuid("lecture_id")
      .notNull()
      .references(() => lectures.id, { onDelete: "cascade" }),
    front: text("front").notNull(),
    back: text("back").notNull(),
    position: integer("position").notNull(),
    // Simplified SM 2 state (spec 0002; tuning constants live in app code).
    ease: real("ease").notNull().default(2.5),
    intervalDays: integer("interval_days").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull().defaultNow(),
    lapses: integer("lapses").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("flashcards_lecture_position_key").on(t.lectureId, t.position),
    index("flashcards_lecture_idx").on(t.lectureId),
    index("flashcards_student_due_idx").on(t.studentId, t.dueAt),
  ],
);

// ── review_logs ───────────────────────────────────────────────────

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    flashcardId: uuid("flashcard_id")
      .notNull()
      .references(() => flashcards.id, { onDelete: "cascade" }),
    grade: reviewGrade("grade").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
    // Local day in students.timezone; the unique constraint makes streak
    // double counting structurally impossible (spec 0002, AC-10).
    reviewedDay: date("reviewed_day")
      .notNull()
      .default(sql`(now() AT TIME ZONE 'Africa/Tunis')::date`),
  },
  (t) => [
    unique("review_logs_student_card_day_key").on(t.studentId, t.flashcardId, t.reviewedDay),
    index("review_logs_student_day_idx").on(t.studentId, t.reviewedDay),
  ],
);

// ── quiz_questions ────────────────────────────────────────────────

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lectureId: uuid("lecture_id")
      .notNull()
      .references(() => lectures.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    options: jsonb("options").notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation"),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("quiz_questions_lecture_position_key").on(t.lectureId, t.position),
    check("quiz_questions_options_check", sql`jsonb_array_length(${t.options}) = 4`),
    index("quiz_questions_lecture_idx").on(t.lectureId),
  ],
);

// ── exam_attempts ─────────────────────────────────────────────────

export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    // Null = global exam across modules (spec 0002).
    moduleId: uuid("module_id").references(() => modules.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    timeTakenSeconds: integer("time_taken_seconds"),
    score: real("score"),
  },
  (t) => [index("exam_attempts_student_started_idx").on(t.studentId, t.startedAt)],
);

// ── exam_attempt_questions ────────────────────────────────────────

export const examAttemptQuestions = pgTable(
  "exam_attempt_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => examAttempts.id, { onDelete: "cascade" }),
    // Nullable on lecture deletion; the snapshot keeps exam history intact.
    questionId: uuid("question_id").references(() => quizQuestions.id, {
      onDelete: "set null",
    }),
    // Zod shape: { prompt, options: string[], correct_index, explanation | null }
    snapshot: jsonb("snapshot").notNull(),
    chosenIndex: integer("chosen_index"),
    isCorrect: boolean("is_correct"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("exam_attempt_questions_attempt_question_key").on(t.attemptId, t.questionId)],
);

// ── usage_events ──────────────────────────────────────────────────

export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    kind: usageKind("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("usage_events_student_created_idx").on(t.studentId, t.createdAt)],
);

// ── chat_messages ─────────────────────────────────────────────────

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    lectureId: uuid("lecture_id")
      .notNull()
      .references(() => lectures.id, { onDelete: "cascade" }),
    role: chatRole("role").notNull(),
    content: text("content").notNull(),
    // Array of lecture_chunks ids the answer cites (spec 0002).
    citedChunkIds: jsonb("cited_chunk_ids"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("chat_messages_lecture_created_idx").on(t.lectureId, t.createdAt)],
);

// ── Relations (for db.query relational reads; declared after tables) ──

export const lecturesRelations = relations(lectures, ({ one, many }) => ({
  module: one(modules, { fields: [lectures.moduleId], references: [modules.id] }),
  chunks: many(lectureChunks),
}));

export const modulesRelations = relations(modules, ({ many }) => ({
  lectures: many(lectures),
}));

export const studentsRelations = relations(students, ({ many }) => ({
  modules: many(modules),
  lectures: many(lectures),
}));
