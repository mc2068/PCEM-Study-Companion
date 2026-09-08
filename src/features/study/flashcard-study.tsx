"use client";

import { useMemo, useState, useTransition } from "react";
import { gradeCardAction } from "@/features/study/actions";
import { COPY } from "@/features/study/constants";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ReviewCompleted } from "@/components/posthog-events";

// Flashcard study (mockup 5): one card centered, Révéler, then the four
// grade buttons (À revoir / Difficile / Acquis / Facile). Grades persist
// via gradeCardAction (SM 2 per spec 0004); a redone day is a no-op server
// side, so the client keeps the moved-on position.

type CardData = { id: string; front: string; back: string };
type Grade = "again" | "hard" | "good" | "easy";

const gradeButtons: { grade: Grade; label: string; className: string }[] = [
  {
    grade: "again",
    label: COPY.gradeAgain,
    className: "bg-error text-on-error hover:bg-error-hover",
  },
  {
    grade: "hard",
    label: COPY.gradeHard,
    className: "bg-accent text-on-accent hover:bg-accent-hover",
  },
  {
    grade: "good",
    label: COPY.gradeGood,
    className: "bg-success text-on-success hover:bg-success-hover",
  },
  {
    grade: "easy",
    label: COPY.gradeEasy,
    className: "bg-primary text-on-primary hover:bg-primary-hover",
  },
];

export function FlashcardStudy({ cards }: { lectureId: string; cards: CardData[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [gradedIds, setGradedIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const card = cards[index];
  const allGraded = cards.length > 0 && gradedIds.length === cards.length;

  const progress = useMemo(
    () => (cards.length === 0 ? 0 : Math.round((gradedIds.length / cards.length) * 100)),
    [gradedIds.length, cards.length],
  );

  function handleGrade(grade: Grade) {
    if (!card) return;
    const current = card;
    setGradedIds((g) => (g.includes(current.id) ? g : [...g, current.id]));
    setRevealed(false);
    setIndex((i) => Math.min(i + 1, cards.length - 1));
    startTransition(async () => {
      await gradeCardAction({ flashcardId: current.id, grade });
    });
  }

  if (cards.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center text-sm text-muted-text">
          {COPY.emptyCards}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <ReviewCompleted done={allGraded} />

      <div className="w-full">
        <Progress
          value={progress}
          label={`${Math.min(gradedIds.length + (allGraded ? 0 : 1), cards.length)} / ${cards.length}`}
        />
      </div>

      {allGraded ? (
        <Card className="w-full max-w-xl shadow-rest">
          <CardContent className="p-10 text-center">
            <p className="text-lg font-semibold">{COPY.quizDone}</p>
            <p className="mt-1 text-sm text-muted-text">
              {cards.length} cartes révisées{pending ? " · enregistrement…" : ""}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="w-full max-w-xl shadow-rest">
            <CardContent className="flex min-h-56 flex-col items-center justify-center gap-5 p-8 text-center">
              <p className="text-lg font-medium leading-relaxed text-text">{card.front}</p>
              {revealed && (
                <div className="w-full border-t border-border pt-4">
                  <p className="text-sm leading-relaxed text-text">{card.back}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {!revealed ? (
            <Button size="lg" onClick={() => setRevealed(true)}>
              {COPY.revealCard}
            </Button>
          ) : (
            <div className="grid w-full max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
              {gradeButtons.map((b) => (
                <Button
                  key={b.grade}
                  variant="secondary"
                  className={cn(b.className, "border-0")}
                  onClick={() => handleGrade(b.grade)}
                >
                  {b.label}
                </Button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
