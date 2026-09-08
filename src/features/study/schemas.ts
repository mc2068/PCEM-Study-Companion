import { z } from "zod";

// AI output schemas (spec 0004) — mirror the spec 0002 column shapes exactly.

export const flashcardSchema = z.object({
  front: z.string().min(1).max(400),
  back: z.string().min(1).max(1200),
});
export type Flashcard = z.infer<typeof flashcardSchema>;

export const quizQuestionSchema = z.object({
  prompt: z.string().min(1).max(600),
  options: z.array(z.string().min(1).max(300)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().max(1200).optional(),
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const chunkOutputSchema = z.object({
  summaryFragment: z.string().min(1),
  flashcards: z.array(flashcardSchema).max(20),
  questions: z.array(quizQuestionSchema).max(5),
});
export type ChunkOutput = z.infer<typeof chunkOutputSchema>;

export const mergedSummarySchema = z.object({
  summary: z.string().min(1),
  keyConcepts: z.array(z.string().min(1).max(200)).min(3).max(8),
});
export type MergedSummary = z.infer<typeof mergedSummarySchema>;

// QStash job payloads (route dispatch).
export const jobSchema = z.object({
  type: z.enum(["prepare", "chunk", "merge"]),
  lectureId: z.string().uuid(),
  chunkIndex: z.number().int().min(0).optional(),
});
export type Job = z.infer<typeof jobSchema>;
