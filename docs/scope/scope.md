# Scope: PCEM Study Companion (working title)

An AI study companion for PCEM students in Tunisia, the two pre clinical years of
medical school, taught in French. It carries the student through the whole journey
from getting the lecture to understanding it to revising it, by turning their own
lecture PDFs into explained summaries, flashcards, quizzes, and a spaced repetition
review queue.

**Build approach:** Tracer Bullet (each slice is one thin real path through every
layer, working end to end; each later slice thickens one segment of that path).
**Workflow:** Beta (after develop runs check verify, then test). The project default
level of rigor. `/architect` is the recommended first stop for a feature with a real
decision, but skippable when you already know the build. Any feature can carry its own
tag (for example `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything
that does not fit: if you already know how to build a feature, use `/develop` and skip
`/architect`. You decide when a feature is `done`._

## At a glance

| #   | Feature                       | Phase      | Status  |
| --- | ----------------------------- | ---------- | ------- |
| 1   | Stack & architecture          | Foundation | shipped |
| 2   | Coding standards & tooling    | Foundation | planned |
| 3   | Data model                    | Foundation | shipped |
| 4   | Design system & UI foundation | Foundation | planned |
| 5   | Core study loop               | Slice 1    | planned |
| 6   | Spaced repetition review      | Slice 2    | planned |
| 7   | Grounded concept chat         | Slice 3    | planned |
| 8   | Module & semester library     | Slice 4    | planned |
| 9   | Exam mode                     | Slice 5    | planned |
| 10  | Progress dashboard            | Slice 6    | planned |

## Foundations

### 1. Stack & architecture · shipped

Choose the stack and scaffold a runnable project so every later slice builds on real
structure. Nothing tooling related happens before this decision.
**Done when:** the stack is recorded in a spec, the empty scaffold boots locally,
passes build, and deploys to a live URL.

- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Scaffold from the decision: `/develop stack & architecture` (boot confirmed 2026-09-07)
- [x] Smoke check it runs: `/test` (live URL responds, Clerk auth wall verified 2026-09-07)

Spec 0001

### 2. Coding standards & tooling

Capture conventions and install lint, format, and pre commit enforcement from the real
scaffolded project, so all later code follows the same rules.
**Done when:** root `AGENTS.md` reflects the real stack, and lint, format and pre
commit run clean.

- [ ] Capture conventions + tooling choices: `/audit`
- [ ] Install the tooling: `/develop tooling`
- [ ] Check it runs clean: `/test`

### 3. Data model · shipped

Core entities every slice builds on: students, semesters, modules, lectures, generated
summaries, flashcards, quiz questions and attempts, and the review schedule.
**Done when:** entities and relationships support every later slice (reviews, chat,
exam mode, dashboard) without a breaking migration.

- [x] Design it (spec): `/architect data model`
- [x] Build it: migration, seed, verify (`/develop data model`)

Spec 0002

### 4. Design system & UI foundation · in-progress

Visual language and base components for a calm, focused, French first interface that
works on a phone sized screen, since students study on phones too.
**Done when:** `design.md` covers type, color, spacing and base components, and base
components handle focus and keyboard.

- [x] Design it (spec): `/architect design system & UI foundation`
- [x] Build it: tokens, components, /design tile, design.md (`/develop design system & UI foundation`)

Spec 0003

## Slice 1: Core study loop

### 5. Core study loop · needs a decision

The walking skeleton, the whole journey thin and real: sign in, upload a lecture PDF,
read a structured summary that explains the key concepts in simple French, study
flashcards, answer a few quiz questions, all generated from that exact lecture.
**Done when:** a signed in student uploads a lecture PDF, reads a structured summary
of its key concepts in simple French within minutes, studies flashcards and answers
quiz questions generated from that same lecture, a failed upload or processing shows
a clear retry state and never silence, and the whole path works on the deployed URL.

- [ ] Design it (spec): `/architect core study loop`

## Slice 2: Spaced repetition review

### 6. Spaced repetition review · needs a decision

Cards come back at growing intervals, so revision happens just before forgetting. This
is the daily return habit and the most evidence backed feature in the product.
**Done when:** cards graded today change what is due on later days, a due today queue
exists per student, and the queue pulls cards from every module, not just the newest
lecture.

- [ ] Design it (spec): `/architect spaced repetition review`

## Slice 3: Grounded concept chat

### 7. Grounded concept chat · needs a decision

Ask a question about the open lecture and get an answer built only from that lecture's
content, so understanding deepens without leaving the source of truth.
**Done when:** an answer uses only the open lecture's content, points to the section
it comes from, and says clearly when the lecture does not contain the answer.

- [ ] Design it (spec): `/architect grounded concept chat`

## Slice 4: Module & semester library

### 8. Module & semester library

Organize lectures the way PCEM organizes them: semesters and named modules like
Anatomie or Histologie, so months of material stay navigable.
**Done when:** lectures are organized by semester and module, the URL reflects the
selection, an empty module shows a friendly state, and every study set links back to
its source lecture.

- [ ] Design it (spec): `/architect module & semester library`

## Slice 5: Exam mode

### 9. Exam mode · needs a decision

A timed session of multiple choice questions drawn from chosen modules, mirroring the
examens blancs culture, with a score and an explanation per question.
**Done when:** a student can start a timed 20 question session from chosen modules,
finish it, and see a score with an explanation for every question.

- [ ] Design it (spec): `/architect exam mode`

## Slice 6: Progress dashboard

### 10. Progress dashboard

Coverage, streak and weak modules from the student's real data, to keep motivation
honest instead of decorative.
**Done when:** the dashboard shows per module coverage, the review streak and the
number of cards due, computed from real data, with an empty state for new students.

- [ ] Design it (spec): `/architect progress dashboard`

## Deferred

Out of scope for the current build pass, kept so the plan stays honest.

- **Billing & paid plans**: freemium, monthly limits with a paid unlimited tier · needs a decision
- **Video & YouTube lectures**: process recorded lectures, not just PDFs · needs a decision
- **Annales & past exams**: students upload past exam PDFs and generate practice sessions from them · needs a decision
- **Arabic interface**: right to left support beyond the French first UI
- **Sharing between students**: shared sets and groups, with moderation
- **Email & push reminders**: nudges for due reviews and coming exams
- **Mobile app**: after the responsive web app proves the daily habit

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends
with `(spec)`. Its wording varies (`Design it (spec)` normally, `Decide the stack
(spec)` on Stack & architecture). Every other box is an execution box.

**Feature lifecycle**: `planned` → `in-progress` → `done`, plus `existing` (before the
workflow) and `dropped` (kept for history). `/scope` sets `planned`. `/architect` fills
the built ready shape at spec capture. `/develop` advances the build boxes. You set
`done`, always; `/sync` reconciles.

- **needs a decision** = run `/architect` first; the tag drops once the spec is captured.
- **Next step** = the first unticked box.
- **Workflow** (header) is the project default: Beta = `/check verify` then `/test`
  after `/develop`. A feature can override with a tag (for example `· GA`).
- **Pointer line** (`spec NNNN · code in <path>`) appears once the spec and code exist.
