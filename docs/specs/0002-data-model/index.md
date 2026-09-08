# 0002. Core relational data model

**Date**: 2026-09-07
**Status**: Accepted

## Summary

This spec decides the complete database shape for the product: eleven tables in Supabase Postgres that every feature builds on. It picks one coherent model now instead of growing table by table, adopts the simplified SM 2 spaced repetition algorithm (each card carries its own ease, interval, and due date), keeps every row owned by a student so deletion and privacy are simple cascades, and stores exam answers as snapshots so history survives lecture deletion. Building it means one migration, one seed script, and no schema churn while the study loop, library, chat, exams, and dashboard get built.

## Requirements

**User stories**:
- As a student, I want my lectures, flashcards, quizzes, exam attempts, and chat history stored so that my study state survives across devices and sessions.
- As a student, I want each flashcard to carry its own review schedule so that the app always knows what to show me today.
- As the operator, I want every row owned by a student id so that account cleanup is one cascade and cross student leaks are structurally impossible.

**Acceptance criteria** (the contract):
- **AC-1**: A single migration creates all eleven tables (`students`, `modules`, `lectures`, `lecture_chunks`, `flashcards`, `review_logs`, `quiz_questions`, `exam_attempts`, `exam_attempt_questions`, `usage_events`, `chat_messages`) with the columns, enums, checks, and uniques declared in the Feature design, and `npm run db:push` applies it to the live Supabase project cleanly.
- **AC-2**: The Drizzle schema in `src/db/schema.ts` exports typed tables matching the ERD exactly (table names, foreign keys, unique constraints, checks), and `npx tsc --noEmit` passes.
- **AC-3**: Every student scoped table carries `student_id` referencing `students` with ON DELETE CASCADE, and lecture children (chunks, flashcards, quiz questions, chat messages) cascade from `lectures`; exam attempt questions keep their history via snapshot (see AC-9).
- **AC-4**: `lectures.processing_state` is an enum (`uploaded`, `processing`, `ready`, `failed`) and `lecture_chunks.status` is an enum (`pending`, `processing`, `done`, `failed`), matching the pipeline states decided in spec 0001.
- **AC-5**: `flashcards` carries the simplified SM 2 state (`ease`, `interval_days`, `due_at`, `lapses`) and `review_logs.grade` is the pgEnum (`again`, `hard`, `good`, `easy`) matching the four grade buttons.
- **AC-6**: Indexes exist for the daily due query (`flashcards`: student_id, due_at), the streak heatmap (`review_logs`: student_id, reviewed_day), and attempt lookups (`exam_attempts`: student_id, started_at).
- **AC-7**: A seed script creates the demo student and one Semester 1 module idempotently (running it twice changes nothing).
- **AC-8**: `usage_events` is append only in app code (insert only, no updates or deletes) and countable per student per day per kind for the quota; its kind enum covers all four metered actions (`lecture_upload`, `chunk_generation`, `chat_message`, `exam_generation`).
- **AC-9**: `exam_attempt_questions` stores a snapshot (prompt, options, correct_index, explanation) at attempt time; deleting a lecture removes its questions but never corrupts or deletes past attempts.
- **AC-10**: One review per card per student per local day is possible (`review_logs` carries `reviewed_day` date with a unique (student_id, flashcard_id, reviewed_day) constraint), so streaks and heatmaps cannot double count.

## Decision

**Chosen option**: Option 1: One coherent relational model now (see `rationale.md`).

Eleven Postgres tables via Drizzle, simplified SM 2 on the card, unified QCM shape for quizzes and exams with snapshot based attempt history, per student timezone defaulting to `Africa/Tunis`, append only usage events, chat history storage, cascade deletes everywhere.

## Feature design

**Data model sketch** (🔑 = foreign key; every table also has `created_at`, lectures add `updated_at`):

| Table | Fields (beyond ids and timestamps) | Relationships and constraints |
|---|---|---|
| students | email (not null, unique), timezone (text, not null, default `Africa/Tunis`) | id = Clerk user id (primary key, decided in spec 0001) |
| modules | student_id 🔑, semester (check in `P1S1`,`P1S2`,`P2S1`,`P2S2`), name (not null), position (int, not null) | FK students cascade; unique (student_id, name); library orders by (semester, position, name) |
| lectures | student_id 🔑, module_id 🔑, title (not null), storage_path (not null), file_name, file_size_bytes, page_count, processing_state enum, total_chunks, processed_chunks, summary (jsonb, nullable, Zod shape: summary text + key_concepts string array), error_message (nullable) | FK students cascade, FK modules; unique (student_id, storage_path) |
| lecture_chunks | lecture_id 🔑, chunk_index (int), page_start, page_end, status enum, extracted_text (nullable), output (jsonb, nullable: per chunk Zod payload summaryFragment, flashcards array, questions array, kept as merge and retry cache) | FK lectures cascade; unique (lecture_id, chunk_index) |
| flashcards | student_id 🔑 (denormalized from lecture for the due query), lecture_id 🔑, front (not null), back (not null), position, ease (real, default 2.5), interval_days (int, default 0), due_at (timestamptz, default now), lapses (int, default 0) | FK students cascade, FK lectures cascade; unique (lecture_id, position); index (lecture_id) and (student_id, due_at) |
| review_logs | student_id 🔑, flashcard_id 🔑, grade enum (`again`,`hard`,`good`,`easy`), reviewed_at (timestamptz, not null, default now), reviewed_day (date, not null, computed in students.timezone) | FK students cascade, FK flashcards cascade; unique (student_id, flashcard_id, reviewed_day); index (student_id, reviewed_day) |
| quiz_questions | lecture_id 🔑, prompt (not null), options (jsonb with a check `jsonb_array_length(options) = 4`), correct_index (int), explanation (nullable), position | FK lectures cascade; unique (lecture_id, position) |
| exam_attempts | student_id 🔑, module_id 🔑 (nullable = global exam), started_at, completed_at (nullable), time_taken_seconds, score (nullable) | FK students cascade, FK modules; index (student_id, started_at) |
| exam_attempt_questions | attempt_id 🔑, question_id 🔑 (nullable, FK ON DELETE SET NULL), snapshot (jsonb, not null: prompt, options, correct_index, explanation captured at attempt start), chosen_index (nullable, null = unanswered), is_correct (nullable, null = unanswered) | FK attempts cascade; unique (attempt_id, question_id); rows pre created at attempt start |
| usage_events | student_id 🔑, kind enum (`lecture_upload`, `chunk_generation`, `chat_message`, `exam_generation`) | FK students cascade; index (student_id, created_at) |
| chat_messages | student_id 🔑, lecture_id 🔑, role enum (`user`, `assistant`), content (text, not null), cited_chunk_ids (jsonb, nullable, array of lecture_chunk ids) | FK students cascade, FK lectures cascade; index (lecture_id, created_at) |

Additional index: `flashcards` (student_id, due_at) for the daily due query.

**State transitions**:
- lecture: `uploaded` → `processing` → `ready` | `failed` (re-enqueue from `failed` returns to `processing`)
- chunk: `pending` → `processing` → `done` | `failed` (retry returns to `processing`)
- exam attempt: started (rows pre created) → completed_at set by the server at submit or expiry; unanswered rows keep `chosen_index` null and are excluded from the score

**API surface**: none in this feature. This spec ships the schema, the migration, and the seed. Read and write surfaces are defined per feature spec (upload, review, chat, exam, dashboard) and must query through these tables only.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Daily review queue | cards due today | `flashcards.due_at` compared against explicit UTC range bounds computed from `students.timezone` |
| Streak and heatmap | study days and streak length | `review_logs.reviewed_day` group by day (one row per card per day guaranteed by the unique constraint) |
| Quota check | generations used today | count of `usage_events` rows for student, kind, and current day bounds from `students.timezone` |
| Lecture progress | chunks done over total | `lectures.processed_chunks` / `lectures.total_chunks` |
| Exam score | percent correct | `exam_attempt_questions.is_correct` count over answered rows (snapshot carries the truth; `question_id` may be null after lecture deletion) |
| Exam question draw | which questions an exam uses | uniform sample from `quiz_questions` joined to `ready` lectures of the chosen module(s); repeats allowed in v1; the timer constant belongs to the exam feature spec |
| Module coverage | reviewed cards over total cards | distinct `review_logs.flashcard_id` per module over its `flashcards` count |
| Weak topics (dashboard) | modules with low correctness | aggregate over `exam_attempt_questions.is_correct` grouped by the snapshot question's lecture (or `question_id` while it lives) |

**Key invariants**:
- Every student scoped row is reachable from a `student_id`; no orphan rows (cascades guarantee it).
- A chunk is unique per (lecture, index); a card position unique per lecture; a question position unique per lecture; a module name unique per student; an email unique per student row.
- Quota counting is append only: events are never mutated, so concurrent generations can never lose a count. The check then insert race can still overshoot the daily cap under parallel requests; accepted for v1, stated here on purpose.
- `due_at`, `reviewed_day`, and quota day bounds always derive from `students.timezone` computed as explicit UTC range bounds, never a server local now and never a client clock.

**Security model**: no Supabase RLS in v1 (decided in spec 0001, the app never exposes Supabase's own API). All access is server side Drizzle queries scoped by the Clerk user id; the service key stays server only. Storage paths under `lectures/` must sit inside the owning student's folder prefix.

**Configuration required**: none beyond the existing `DATABASE_URL`.

**Critical test scenarios**:
- Happy path: seed runs, `students` and `modules` contain the demo rows; second seed run is a no op, verifies **AC-7**
- Integrity: deleting a student removes their modules, lectures, chunks, cards, logs, attempts, events, and chat messages in one cascade with no orphans, verifies **AC-3**
- History: deleting a lecture leaves its exam attempts' snapshots intact and `question_id` set to null, verifies **AC-9**
- Dedupe: grading the same card twice in one Tunisian day inserts one `review_logs` row (second insert violates the unique constraint), verifies **AC-10**
- State: a lecture row moves `uploaded` → `processing` → `ready` only through the enum values, and a failed chunk can re-enter `processing`, verifies **AC-4**
- Shape: inserting a question with 3 options violates the options check, verifies **AC-2**

## Build plan

Tracer Bullet ordering: schema first end to end, then the live push, then the seed, then verification against the running database.

1. Write the full Drizzle schema (`src/db/schema.ts`): all eleven tables, pgEnums for lecture state, chunk state, review grade, usage kind, and chat role, checks (options count), uniques (email, positions, review day, chunk index), and indexes (due cards, heatmap, attempts), satisfies **AC-2**, **AC-4**, **AC-5**, **AC-6**, **AC-8**, **AC-10**
2. Add `students.timezone` and all cascade definitions to the existing table set, satisfies **AC-3**
3. Push the migration to the live Supabase project (`npm run db:push`), satisfies **AC-1**
4. Write and run the idempotent seed script (`scripts/db/seed-demo.mjs`), satisfies **AC-7**
5. Verify with the socket script pattern (table list, column spot checks, quota count query, cascade and dedupe probes), satisfies **AC-1**, **AC-8**, **AC-9**, **AC-10**

## Consequences

**Positive**:
- Every later feature builds on a stable, typed schema; no migration churn between slices.
- The pipeline states, SM 2 columns, quota events, and chat storage promised across scope and spec 0001 now exist as concrete columns.
- Account deletion becomes a single cascade, closing a spec 0001 follow-up.
- Exam history survives lecture deletion; streaks cannot double count.

**Negative / tradeoffs**:
- Modeling everything now risks drift if a later feature spec wants a different shape; the rule is that feature specs amend this spec by update, never fork the schema silently.
- `review_logs` grows one row per review per day per card forever; fine at free tier scale, revisit if a paid tier arrives.
- Quiz `options` and attempt snapshots as jsonb trade schema enforcement for flexibility; shapes are pinned by database checks and Zod in application code.
- The quota check then insert race can overshoot the daily cap under parallel requests; accepted for v1.

**Neutral**:
- No row level security in v1 (the app is the only database client); enabling RLS later is additive.
- SM 2 constants (ease floor, interval caps) live in application code and get tuned by the review feature spec.

## Follow-up

- [ ] After acceptance: link spec 0002 into scope row 3 and tick its Design it box
- [ ] Review feature spec (Slice 1) owns the SM 2 tuning constants and the exact grade to quality mapping
- [ ] Exam feature spec owns the timer constant and the draw size; this spec owns only the storage
- [ ] Revisit `review_logs` growth, the quota race, and RLS only if usage or tiers change

## Rationale

See `rationale.md`.
