"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { flashcards, lectures, modules, reviewLogs, usageEvents } from "@/db/schema";
import { requireStudent, ensureDefaultModule } from "./student";
import { createSignedUploadUrl } from "./storage";
import { publishJob } from "./qstash";
import { dailyUploadCount, localDayString } from "./queries";
import { COPY, DAILY_UPLOAD_CAP, MAX_FILE_SIZE_BYTES, SM2 } from "./constants";
import type { ReviewGrade } from "./grades";

export type ActionOk = { ok: true };
export type ActionFailure = { ok: false; error: string; status: number };
export type ActionResult = ActionOk | ActionFailure;

const err = (error: string, status: number): ActionFailure => ({ ok: false, error, status });

// ── createUpload (AC-2, AC-3, AC-10) ──────────────────────────────

export async function createUploadAction(input: {
  fileName: string;
  fileSizeBytes: number;
  moduleId?: string | null;
}): Promise<{ ok: true; lectureId: string; uploadUrl: string } | ActionFailure> {
  const student = await requireStudent();

  if (!/\.pdf$/i.test(input.fileName.trim())) return err(COPY.errNotPdf, 400);
  if (input.fileSizeBytes <= 0 || input.fileSizeBytes > MAX_FILE_SIZE_BYTES)
    return err(COPY.errTooBig, 413);

  // Cap is checked BEFORE any row is created (spec 0004 invariant).
  const used = await dailyUploadCount(student.id, student.timezone);
  if (used >= DAILY_UPLOAD_CAP) return err(COPY.errCap, 429);

  let moduleId = input.moduleId ?? null;
  if (moduleId) {
    const owned = await db.query.modules.findFirst({
      where: and(eq(modules.id, moduleId), eq(modules.studentId, student.id)),
    });
    if (!owned) return err(COPY.errGeneric, 400);
  } else {
    moduleId = await ensureDefaultModule(student.id);
  }

  const title =
    input.fileName
      .replace(/\.pdf$/i, "")
      .trim()
      .slice(0, 120) || "Cours sans titre";
  const lectureId = crypto.randomUUID();
  const storagePath = `${student.id}/${lectureId}.pdf`;

  await db.insert(lectures).values({
    id: lectureId,
    studentId: student.id,
    moduleId,
    title,
    storagePath,
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes,
    processingState: "uploaded",
  });

  const uploadUrl = await createSignedUploadUrl(storagePath);
  return { ok: true, lectureId, uploadUrl };
}

// ── finalizeUpload (AC-4, AC-10) ──────────────────────────────────

export async function finalizeUploadAction(input: { lectureId: string }): Promise<ActionResult> {
  const student = await requireStudent();

  const lecture = await db.query.lectures.findFirst({
    where: and(eq(lectures.id, input.lectureId), eq(lectures.studentId, student.id)),
  });
  if (!lecture) return err("404", 404);

  // Cap re-check closes the parallel-upload race (spec 0004, AC-10).
  const used = await dailyUploadCount(student.id, student.timezone);
  if (used >= DAILY_UPLOAD_CAP) return err(COPY.errCap, 429);

  // Atomic claim: uploaded → processing is the gate for the usage event.
  const claimed = await db
    .update(lectures)
    .set({ processingState: "processing", updatedAt: new Date() })
    .where(
      and(
        eq(lectures.id, input.lectureId),
        eq(lectures.studentId, student.id),
        eq(lectures.processingState, "uploaded"),
      ),
    )
    .returning({ id: lectures.id });
  if (claimed.length === 0) return err(COPY.errGeneric, 409);

  // Usage event insert is gated by the claim above (idempotent under replay).
  await db.insert(usageEvents).values({ studentId: student.id, kind: "lecture_upload" });

  await publishJob({ type: "prepare", lectureId: input.lectureId });
  return { ok: true };
}

// ── retryLecture (AC-6) ───────────────────────────────────────────

export async function retryLectureAction(input: { lectureId: string }): Promise<ActionResult> {
  const student = await requireStudent();

  // Atomic claim: failed → processing; done chunk outputs stay as cache.
  const claimed = await db
    .update(lectures)
    .set({ processingState: "processing", errorMessage: null, updatedAt: new Date() })
    .where(
      and(
        eq(lectures.id, input.lectureId),
        eq(lectures.studentId, student.id),
        eq(lectures.processingState, "failed"),
      ),
    )
    .returning({ id: lectures.id });
  if (claimed.length === 0) return err(COPY.errGeneric, 409);

  await db.insert(usageEvents).values({ studentId: student.id, kind: "lecture_upload" });

  await publishJob({ type: "prepare", lectureId: input.lectureId });
  return { ok: true };
}

// ── gradeCard (AC-8) — SM 2 per spec 0004 constants ───────────────

export async function gradeCardAction(input: { flashcardId: string; grade: ReviewGrade }): Promise<
  | {
      ok: true;
      duplicate: false;
      dueAt: string;
      ease: number;
      intervalDays: number;
      lapses: number;
    }
  | { ok: true; duplicate: true }
  | ActionFailure
> {
  const student = await requireStudent();

  const card = await db.query.flashcards.findFirst({
    where: and(eq(flashcards.id, input.flashcardId), eq(flashcards.studentId, student.id)),
  });
  if (!card) return err("404", 404);

  const [prior] = await db
    .select({ n: sql<number>`count(*)` })
    .from(reviewLogs)
    .where(eq(reviewLogs.flashcardId, card.id));
  const isFirstGrading = Number(prior?.n ?? 0) === 0;

  const reviewedDay = localDayString(student.timezone);
  const inserted = await db
    .insert(reviewLogs)
    .values({ studentId: student.id, flashcardId: card.id, grade: input.grade, reviewedDay })
    .onConflictDoNothing({
      target: [reviewLogs.studentId, reviewLogs.flashcardId, reviewLogs.reviewedDay],
    })
    .returning({ id: reviewLogs.id });
  // One review per card per local day: a duplicate is a silent no op (AC-8).
  if (inserted.length === 0) return { ok: true, duplicate: true };

  const now = new Date();
  let ease = card.ease;
  let lapses = card.lapses;
  let intervalDays: number;
  let dueAt: Date;

  const schedule = (days: number) => new Date(now.getTime() + days * 86_400_000);

  if (input.grade === "again") {
    ease = Math.max(SM2.easeFloor, ease - SM2.lapseEasePenalty);
    lapses += 1;
    intervalDays = 0;
    dueAt = new Date(now.getTime() + SM2.againMinutes * 60_000);
  } else if (isFirstGrading) {
    ease = Math.max(SM2.easeFloor, ease - (input.grade === "hard" ? SM2.hardEasePenalty : 0));
    intervalDays =
      input.grade === "hard"
        ? SM2.first.hardDays
        : input.grade === "good"
          ? SM2.first.goodDays
          : SM2.first.easyDays;
    dueAt = schedule(intervalDays);
  } else if (input.grade === "hard") {
    ease = Math.max(SM2.easeFloor, ease - SM2.hardEasePenalty);
    intervalDays = Math.min(
      SM2.intervalMaxDays,
      Math.max(1, Math.ceil(card.intervalDays * SM2.hardFactor)),
    );
    dueAt = schedule(intervalDays);
  } else {
    ease = Math.min(5, ease + (input.grade === "easy" ? SM2.hardEasePenalty : 0));
    const base = Math.max(1, card.intervalDays);
    intervalDays = Math.min(
      SM2.intervalMaxDays,
      Math.ceil(input.grade === "easy" ? base * card.ease * SM2.easyFactor : base * card.ease),
    );
    dueAt = schedule(intervalDays);
  }

  await db
    .update(flashcards)
    .set({ ease, intervalDays, dueAt, lapses })
    .where(eq(flashcards.id, card.id));

  return { ok: true, duplicate: false, dueAt: dueAt.toISOString(), ease, intervalDays, lapses };
}
