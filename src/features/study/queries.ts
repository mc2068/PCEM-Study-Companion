import { and, asc, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { flashcards, lectures, modules, quizQuestions, reviewLogs, usageEvents } from "@/db/schema";
import { DAILY_UPLOAD_CAP } from "./constants";

// Server-only read layer (spec 0004 value sourcing). Pages and actions
// share these queries; every one is scoped by student ownership.

// Timezone aware local day bounds (spec 0002: per student timezone,
// default Africa/Tunis). Returns [start, end) in UTC instants.
export function localDayBoundsUTC(timezone: string, now: Date = new Date()) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(now).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const offsetMs = asUTC - now.getTime();
  const localMidnight = Math.floor((now.getTime() + offsetMs) / 86_400_000) * 86_400_000;
  return {
    start: new Date(localMidnight - offsetMs),
    end: new Date(localMidnight + 86_400_000 - offsetMs),
  };
}

// YYYY-MM-DD in the student's timezone (review_logs.reviewed_day).
export function localDayString(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
}

export async function dailyUploadCount(studentId: string, timezone: string): Promise<number> {
  const { start, end } = localDayBoundsUTC(timezone);
  const [row] = await db
    .select({ n: count() })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.studentId, studentId),
        eq(usageEvents.kind, "lecture_upload"),
        gte(usageEvents.createdAt, start),
        lt(usageEvents.createdAt, end),
      ),
    );
  return row?.n ?? 0;
}

export const dailyUploadCap = DAILY_UPLOAD_CAP;

export async function getHomeData(studentId: string, timezone: string) {
  const rows = await db
    .select({
      id: lectures.id,
      title: lectures.title,
      processingState: lectures.processingState,
      processedChunks: lectures.processedChunks,
      totalChunks: lectures.totalChunks,
      updatedAt: lectures.updatedAt,
      moduleName: modules.name,
    })
    .from(lectures)
    .innerJoin(modules, eq(modules.id, lectures.moduleId))
    .where(eq(lectures.studentId, studentId))
    .orderBy(desc(lectures.updatedAt))
    .limit(20);

  const { start, end } = localDayBoundsUTC(timezone);
  const [dueRow] = await db
    .select({ n: count() })
    .from(flashcards)
    .where(
      and(
        eq(flashcards.studentId, studentId),
        gte(flashcards.dueAt, start),
        lt(flashcards.dueAt, end),
      ),
    );

  const [streakRow] = await db
    .select({ n: sql<number>`count(distinct ${reviewLogs.reviewedDay})` })
    .from(reviewLogs)
    .where(eq(reviewLogs.studentId, studentId));

  const moduleRows = await db
    .select({ id: modules.id, name: modules.name })
    .from(modules)
    .where(eq(modules.studentId, studentId))
    .orderBy(asc(modules.position), asc(modules.name));

  return {
    lectures: rows,
    dueCount: dueRow?.n ?? 0,
    streakDays: streakRow?.n ?? 0,
    modules: moduleRows,
  };
}

export async function getLectureForStudent(lectureId: string, studentId: string) {
  return db.query.lectures.findFirst({
    where: and(eq(lectures.id, lectureId), eq(lectures.studentId, studentId)),
    with: { module: true },
  });
}

export async function getFlashcardsForLecture(lectureId: string) {
  return db
    .select()
    .from(flashcards)
    .where(eq(flashcards.lectureId, lectureId))
    .orderBy(asc(flashcards.position));
}

export async function getQuizQuestionsForLecture(lectureId: string) {
  return db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.lectureId, lectureId))
    .orderBy(asc(quizQuestions.position));
}

export async function getModulesForStudent(studentId: string) {
  return db
    .select({ id: modules.id, name: modules.name, semester: modules.semester })
    .from(modules)
    .where(eq(modules.studentId, studentId))
    .orderBy(asc(modules.position), asc(modules.name));
}

// Stuck-state thresholds for the reaper live in constants.ts; this file is read only.
