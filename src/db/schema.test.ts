import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  chatMessages,
  examAttemptQuestions,
  examAttempts,
  flashcards,
  lectureChunks,
  lectures,
  modules,
  quizQuestions,
  reviewLogs,
  students,
  usageEvents,
} from "./schema";

describe("db schema (spec 0002)", () => {
  it("exports the eleven tables", () => {
    const tables = [
      students,
      modules,
      lectures,
      lectureChunks,
      flashcards,
      reviewLogs,
      quizQuestions,
      examAttempts,
      examAttemptQuestions,
      usageEvents,
      chatMessages,
    ].map((t) => getTableName(t));

    expect(tables).toHaveLength(11);
    expect(new Set(tables).size).toBe(11);
  });

  it("keys the students table by the Clerk user id", () => {
    expect(getTableName(students)).toBe("students");
    expect(students.id.primary).toBe(true);
  });
});
