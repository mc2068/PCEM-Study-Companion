// Mirrors the review_grade pgEnum in src/db/schema.ts (spec 0002, AC-5).
export type ReviewGrade = "again" | "hard" | "good" | "easy";

export const REVIEW_GRADES: ReviewGrade[] = ["again", "hard", "good", "easy"];

export function isReviewGrade(value: unknown): value is ReviewGrade {
  return typeof value === "string" && (REVIEW_GRADES as string[]).includes(value);
}
