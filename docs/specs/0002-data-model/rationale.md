# 0002 rationale — core relational data model

## Context

Spec 0001 settled the stack but left the data model undecided on purpose, and it recorded an owed decision: the spaced repetition algorithm had to be chosen by the data model spec. The scope promises ten features that all read and write the same study state: uploads and their processing pipeline, flashcard review with streaks, grounded chat, a library of semesters and modules, timed exams, and a progress dashboard. The database is live (Supabase Postgres, pooled connection proven) with only a `students` table in it. Building features one at a time without a decided schema would mean either guessing tables per feature or blocking every slice on a new migration; the forces are a solo builder, a free tier database, French first UI, and a processing pipeline whose states were already promised in 0001.

## Options considered

### Option 1: One coherent relational model now (chosen)

Model all ten features' entities in one spec: modules, lectures, chunks, flashcards with inline SM 2 state, review logs, quiz questions, exam attempts with per question rows, and append only usage events. One migration, one seed.

**Pros**:
- Every slice builds on stable, typed tables; the dashboard and exam mode never wait on a migration.
- Relationships (cascade ownership, uniques, indexes) are designed once, coherently, instead of accreting.

**Cons**:
- Later feature specs might want shapes this model did not predict; drift must be managed by amending this spec.
- Slightly more upfront design than Slice 1 strictly needs.

### Option 2: Slice 1 minimal schema

Only what the core study loop needs now (lectures, chunks, flashcards, review logs); semesters, exams, and usage arrive with their slices.

**Pros**:
- Smallest first step; nothing speculative.

**Cons**:
- Four separate migrations across slices, each touching shared tables; every slice carries schema risk.
- The exam tables and usage events were already fully specified in conversation; deferring them records no new information, only delay.

### Option 3: Document oriented hybrid

Store generated study sets (cards, questions) as JSONB documents on the lecture row instead of relational rows.

**Pros**:
- One insert per generated lecture; trivially flexible to prompt changes.

**Cons**:
- SM 2 needs per card mutable state and indexed due dates; JSONB fights both.
- Per question exam rows and due card queries become application side filtering; the dashboard aggregates get slow and ugly.
- Spec 0001's chunked pipeline already produces per chunk relational rows; the hybrid would split the model in two styles.

## Rationale

The decision rests on three forces from Context. First, the scope is already fully enumerated (ten features, seven deferrals), so "model everything now" is not speculation; the entities are known and the conversation with the engineer confirmed each rule (semester as a check column, unified QCM shape, timezone column, append only quota events). Second, spec 0001's pipeline decisions (chunk rows, processing states, per student quota) only become real as columns and enums; this spec pays that debt with exact matches to 0001's language. Third, SM 2 was the owed algorithm decision: simplified SM 2 with inline state on the card won because cards belong to one student's lecture (no sharing in scope), the four grade buttons map to quality 0 to 3, and the state is three numbers and a date, which a relational row holds perfectly. The unified QCM shape for quizzes and exams keeps one question table and one attempt trail whose per question correctness is exactly what the dashboard's weak topics view needs later. The timezone column defaulting to `Africa/Tunis` exists because due dates and streaks need a local day boundary; Tunisia has one timezone, so a column with a default removes the whole class of client trusted time bugs for free. Append only usage events were chosen over a mutable counter because counting cannot race while incrementing can, and the free tier quota is exactly the place a silent undercount hurts.

## References

**Project sources** (verifiable, in this repo):
- `docs/scope/scope.md` row 3 (Data model: the decision box and Done when this spec executes)
- `docs/specs/0001-stack-and-architecture/index.md` (pipeline states, quota decision, owed SR algorithm decision, storage ceiling)
- `AGENTS.md` (folder by feature rule, server only database access, Drizzle only)

**Practices & standards**:
- SM 2 spaced repetition algorithm (SuperMemo; simplified variant with quality 0 to 3), the owed decision from spec 0001
- Append only event records for metering and quotas (count instead of increment, no lost updates)
- Cascade delete ownership for user scoped rows (account cleanup as one operation)
- Local day boundary from a stored IANA timezone rather than client clocks

**Links**: none verified this run (no web fetch was part of this decision; the algorithm and practices are named for the human to follow).

## Post cross check record

The independent cross check (fresh context review, 2026-09-07) returned 14 gaps and 5 soundness notes; all were accepted and folded into the spec. The load bearing ones: exam answers are now snapshot jsonb with the question foreign key nullable on delete, so deleting a lecture can never corrupt exam history (the worst latent bug found); grounded chat got its missing table (`chat_messages`), because the conventions say the UI only shows stored data and chat had no storage; the usage kind enum gained `chat_message` and `exam_generation` before the no schema churn promise became credible; flashcards gained a denormalized `student_id` so the daily due index actually references a real column; and review logs gained a `reviewed_day` date with a unique per (student, card, day) constraint, which upgrades the streak guarantee from application discipline to a database fact. The quota check then insert race was the one accepted tradeoff, stated in Consequences rather than fixed, because fixing it needs serializable isolation that a free tier database should not spend on an overflow that costs at most a few extra generations.
