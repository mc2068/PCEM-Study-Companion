import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStudent } from "@/features/study/student";
import { reapStuckLectures } from "@/features/study/pipeline";
import {
  getFlashcardsForLecture,
  getLectureForStudent,
  getQuizQuestionsForLecture,
} from "@/features/study/queries";
import { COPY } from "@/features/study/constants";
import { LectureHeader } from "@/features/study/lecture-header";
import { FlashcardStudy } from "@/features/study/flashcard-study";
import { QuizView } from "@/features/study/quiz-view";
import { GenerationCompleted } from "@/components/posthog-events";

export const dynamic = "force-dynamic";

type Tab = "resume" | "flashcards" | "quiz" | "chat";

export default async function LecturePage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await props.params;
  const { tab } = await props.searchParams;
  const activeTab: Tab = tab === "flashcards" || tab === "quiz" || tab === "chat" ? tab : "resume";

  const student = await requireStudent();
  await reapStuckLectures(student.id);

  const lecture = await getLectureForStudent(id, student.id);
  if (!lecture) notFound();

  const cards = activeTab === "flashcards" ? await getFlashcardsForLecture(id) : [];
  const questions = activeTab === "quiz" ? await getQuizQuestionsForLecture(id) : [];
  const summary = (lecture.summary ?? null) as { summary: string; key_concepts: string[] } | null;
  const isReady = lecture.processingState === "ready";

  const tabs: { key: Tab; label: string }[] = [
    { key: "resume", label: COPY.summaryTab },
    { key: "flashcards", label: COPY.flashcardsTab },
    { key: "quiz", label: COPY.quizTab },
    { key: "chat", label: COPY.chatTab },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-24 pt-8">
      <LectureHeader
        lectureId={lecture.id}
        title={lecture.title}
        moduleName={lecture.module.name}
        state={lecture.processingState}
        processed={lecture.processedChunks}
        total={lecture.totalChunks}
        errorMessage={lecture.errorMessage}
      />

      <nav aria-label="Sections du cours" className="mt-4 flex gap-1 border-b border-border">
        {tabs.map((t) => {
          const disabled = t.key === "chat";
          return (
            <Link
              key={t.key}
              href={disabled ? "#" : `/lectures/${id}${t.key === "resume" ? "" : `?tab=${t.key}`}`}
              aria-current={activeTab === t.key ? "page" : undefined}
              title={disabled ? COPY.chatSoon : undefined}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? "border-primary text-primary-text"
                  : "border-transparent text-muted-text hover:text-text"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">
        {activeTab === "resume" && (
          <section>
            {isReady && summary ? (
              <>
                <article className="space-y-3 text-sm leading-relaxed text-text">
                  {summary.summary.split("\n\n").map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </article>
                {summary.key_concepts.length > 0 && (
                  <section className="mt-8">
                    <h2 className="text-lg font-semibold">{COPY.keyConceptsTitle}</h2>
                    <ul className="mt-3 space-y-2">
                      {summary.key_concepts.map((concept) => (
                        <li
                          key={concept}
                          className="rounded-r-lg border-l-4 border-primary bg-primary-tint/40 px-4 py-2.5 text-sm font-medium"
                        >
                          {concept}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            ) : (
              isReady && <p className="text-sm text-muted-text">{COPY.noSummaryYet}</p>
            )}
            {isReady && <GenerationCompleted ready={isReady} />}
          </section>
        )}

        {activeTab === "flashcards" && (
          <FlashcardStudy
            lectureId={lecture.id}
            cards={cards.map((c) => ({ id: c.id, front: c.front, back: c.back }))}
          />
        )}

        {activeTab === "quiz" && (
          <QuizView
            questions={questions.map((q) => ({
              id: q.id,
              prompt: q.prompt,
              options: (q.options as string[]) ?? [],
              correctIndex: q.correctIndex,
              explanation: q.explanation ?? undefined,
            }))}
          />
        )}

        {activeTab === "chat" && (
          <div className="rounded-xl border border-dashed border-border bg-surface-muted p-6 text-center">
            <p className="text-sm text-muted-text">{COPY.chatSoon}</p>
          </div>
        )}
      </div>
    </div>
  );
}
