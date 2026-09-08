import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { lectureChunks, lectures, flashcards, quizQuestions } from "@/db/schema";
import { fetchLectureBytes } from "./storage";
import { publishJob } from "./qstash";
import { runChunkInference, runMergeInference } from "./gemini";
import { chunkOutputSchema, mergedSummarySchema, type ChunkOutput } from "./schemas";
import {
  CHUNK_PAGES,
  MAX_CARDS_PER_CHUNK,
  MAX_QUESTIONS_PER_CHUNK,
  STUCK_CHUNK_MS,
} from "./constants";

// Spec 0004 pipeline: prepare → N × chunk → merge, idempotent under
// QStash re delivery. Only this module imports pdf-lib (server side).

// ── prepare: validate PDF, plan chunks, publish chunk jobs ────────

export async function runPrepare(lectureId: string): Promise<void> {
  const lecture = await db.query.lectures.findFirst({ where: eq(lectures.id, lectureId) });
  if (!lecture) return;

  const bytes = await fetchLectureBytes(lecture.storagePath);
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true }); // throws on non PDF → failed
  const pageCount = pdf.getPageCount();
  const totalChunks = Math.ceil(pageCount / CHUNK_PAGES);

  // Idempotent replanning: create missing chunk rows, keep existing outputs.
  await db
    .insert(lectureChunks)
    .values(
      Array.from({ length: totalChunks }, (_, i) => ({
        lectureId,
        chunkIndex: i,
        pageStart: i * CHUNK_PAGES + 1,
        pageEnd: Math.min((i + 1) * CHUNK_PAGES, pageCount),
        status: "pending" as const,
      })),
    )
    .onConflictDoNothing({ target: [lectureChunks.lectureId, lectureChunks.chunkIndex] });

  await db
    .update(lectures)
    .set({ pageCount, totalChunks, updatedAt: new Date() })
    .where(eq(lectures.id, lectureId));

  const planned = await db.query.lectureChunks.findMany({
    where: and(eq(lectureChunks.lectureId, lectureId), eq(lectureChunks.status, "pending")),
  });
  for (const chunk of planned) {
    await publishJob({ type: "chunk", lectureId, chunkIndex: chunk.chunkIndex });
  }
}

// ── chunk: one Gemini call per page range, transition gated write ──

export async function runChunk(lectureId: string, chunkIndex: number): Promise<void> {
  const chunk = await db.query.lectureChunks.findFirst({
    where: and(eq(lectureChunks.lectureId, lectureId), eq(lectureChunks.chunkIndex, chunkIndex)),
  });
  if (!chunk) return;

  // Claim pending → processing; a redelivery that lost the race is a no op.
  const claimed = await db
    .update(lectureChunks)
    .set({ status: "processing", createdAt: new Date() })
    .where(and(eq(lectureChunks.id, chunk.id), eq(lectureChunks.status, "pending")))
    .returning({ id: lectureChunks.id });
  if (claimed.length === 0) return;

  try {
    const lecture = await db.query.lectures.findFirst({ where: eq(lectures.id, lectureId) });
    if (!lecture) return;

    const bytes = await fetchLectureBytes(lecture.storagePath);
    const { PDFDocument } = await import("pdf-lib");
    const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const sub = await PDFDocument.create();
    const pageIndices = Array.from(
      { length: (chunk.pageEnd ?? 0) - (chunk.pageStart ?? 1) + 1 },
      (_, i) => (chunk.pageStart ?? 1) - 1 + i,
    ).filter((i) => i < source.getPageCount());
    const copied = await sub.copyPages(source, pageIndices);
    copied.forEach((p) => sub.addPage(p));
    const chunkBytes = await sub.save();

    const output = await runChunkInference(new Uint8Array(chunkBytes));

    // Parse-validate before storing; invalid model output is permanent.
    const parsed: ChunkOutput = chunkOutputSchema.parse(output);

    // Transition gated upsert carries the output; redelivery is a no op.
    const done = await db
      .update(lectureChunks)
      .set({ status: "done", output: parsed })
      .where(and(eq(lectureChunks.id, chunk.id), eq(lectureChunks.status, "processing")))
      .returning({ id: lectureChunks.id });
    if (done.length === 0) return;

    await db
      .update(lectures)
      .set({ processedChunks: sql`${lectures.processedChunks} + 1`, updatedAt: new Date() })
      .where(eq(lectures.id, lectureId));

    // Last chunk to finish publishes the merge (merge itself re-verifies).
    const fresh = await db.query.lectures.findFirst({ where: eq(lectures.id, lectureId) });
    if (fresh && fresh.processedChunks >= fresh.totalChunks && fresh.totalChunks > 0) {
      await publishJob({ type: "merge", lectureId });
    }
  } catch (e) {
    // Permanent errors (invalid Zod, bad PDF range) stop retrying; the
    // lecture flips to failed on read or here. Transient errors leave the
    // chunk unclaimed-able? No: we release it back to pending so QStash's
    // remaining retries (publish-level) or the student retry can redo it.
    const message = e instanceof Error ? e.message : String(e);
    const permanent =
      message.includes("Chunk inference failed") || message.includes("Invalid chunk output");
    await db
      .update(lectureChunks)
      .set({ status: "failed", output: null })
      .where(and(eq(lectureChunks.id, chunk.id), eq(lectureChunks.status, "processing")));
    if (permanent) {
      await db
        .update(lectures)
        .set({
          processingState: "failed",
          errorMessage: message.slice(0, 500),
          updatedAt: new Date(),
        })
        .where(eq(lectures.id, lectureId));
    } else {
      await db
        .update(lectureChunks)
        .set({ status: "pending" })
        .where(and(eq(lectureChunks.id, chunk.id), eq(lectureChunks.status, "failed")));
      await db
        .update(lectures)
        .set({ processingState: "failed", errorMessage: null, updatedAt: new Date() })
        .where(and(eq(lectures.id, lectureId), eq(lectures.processingState, "processing")));
    }
    throw e; // 5xx for QStash retry on transient; permanent already recorded
  }
}

// ── merge: claimed composition, study set insert, ready ───────────

export async function runMerge(lectureId: string): Promise<void> {
  const chunks = await db.query.lectureChunks.findMany({
    where: and(eq(lectureChunks.lectureId, lectureId), eq(lectureChunks.status, "done")),
    orderBy: lectureChunks.chunkIndex,
  });

  const lecture = await db.query.lectures.findFirst({ where: eq(lectures.id, lectureId) });
  if (!lecture) return;

  // Claim: only a processing lecture with every chunk done merges once.
  const claimed = await db
    .update(lectures)
    .set({ updatedAt: new Date() })
    .where(
      and(
        eq(lectures.id, lectureId),
        eq(lectures.processingState, "processing"),
        eq(lectures.processedChunks, lecture.totalChunks),
      ),
    )
    .returning({ id: lectures.id });
  if (claimed.length === 0) return;

  try {
    const fragments = chunks.map((c) => (c.output as ChunkOutput).summaryFragment);
    const merged = mergedSummarySchema.parse(await runMergeInference(lecture.title, fragments));
    // Stored shape per schema comment: { summary, key_concepts }
    const summaryDoc = { summary: merged.summary, key_concepts: merged.keyConcepts };

    await db.update(lectures).set({ summary: summaryDoc }).where(eq(lectures.id, lectureId));

    // Insert study set positionally; unique (lectureId, position) makes a
    // replay a no op thanks to onConflictDoNothing.
    const cardRows = chunks.flatMap((c) =>
      ((c.output as ChunkOutput).flashcards ?? []).map((f, i) => ({
        studentId: lecture.studentId,
        lectureId,
        front: f.front,
        back: f.back,
        position: c.chunkIndex * MAX_CARDS_PER_CHUNK + i,
      })),
    );
    if (cardRows.length > 0) {
      await db
        .insert(flashcards)
        .values(cardRows)
        .onConflictDoNothing({
          target: [flashcards.lectureId, flashcards.position],
        });
    }

    const questionRows = chunks.flatMap((c) =>
      ((c.output as ChunkOutput).questions ?? []).map((q, i) => ({
        lectureId,
        prompt: q.prompt,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation ?? null,
        position: c.chunkIndex * MAX_QUESTIONS_PER_CHUNK + i,
      })),
    );
    if (questionRows.length > 0) {
      await db
        .insert(quizQuestions)
        .values(questionRows)
        .onConflictDoNothing({
          target: [quizQuestions.lectureId, quizQuestions.position],
        });
    }

    await db
      .update(lectures)
      .set({ processingState: "ready", updatedAt: new Date() })
      .where(eq(lectures.id, lectureId));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db
      .update(lectures)
      .set({
        processingState: "failed",
        errorMessage: message.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(and(eq(lectures.id, lectureId), eq(lectures.processingState, "processing")));
    throw e;
  }
}

// ── reaper on read (AC-6): stuck states become failed, in French copy ──

export async function reapStuckLectures(studentId: string): Promise<void> {
  const now = Date.now();

  // Chunks stuck in processing over the threshold → failed.
  const stuckThreshold = new Date(now - STUCK_CHUNK_MS);
  await db
    .update(lectureChunks)
    .set({ status: "failed" })
    .where(
      and(eq(lectureChunks.status, "processing"), lte(lectureChunks.createdAt, stuckThreshold)),
    );

  // Lectures with a failed or stuck chunk → failed (French message at render).
  const brokenLectures = await db.query.lectures.findMany({
    where: and(eq(lectures.studentId, studentId), eq(lectures.processingState, "processing")),
    with: { chunks: true },
  });
  for (const l of brokenLectures) {
    const hasFailedChunk = l.chunks.some((c) => c.status === "failed");
    const zeroProgressTooLong =
      l.processedChunks === 0 && l.updatedAt.getTime() < now - STUCK_CHUNK_MS;
    if (hasFailedChunk || zeroProgressTooLong) {
      await db
        .update(lectures)
        .set({
          processingState: "failed",
          errorMessage: "Traitement interrompu. Relance.",
          updatedAt: new Date(),
        })
        .where(and(eq(lectures.id, l.id), eq(lectures.processingState, "processing")));
    }
  }
}
