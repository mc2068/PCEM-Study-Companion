"use client";

import { useMemo, useState } from "react";
import { COPY } from "@/features/study/constants";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Quiz view (mockup 6): counter, options A-D with single selection,
// Valider reveals correct/incorrect + explanation, then next question.

type Question = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

const LETTERS = ["A", "B", "C", "D"];

export function QuizView({ questions }: { questions: Question[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [validated, setValidated] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);

  const question = questions[index];
  const done = questions.length > 0 && answered === questions.length;

  const progress = useMemo(
    () => (questions.length === 0 ? 0 : Math.round((answered / questions.length) * 100)),
    [answered, questions.length],
  );

  function validate() {
    if (selected === null) return;
    setValidated(true);
    setAnswered((n) => n + 1);
    if (selected === question.correctIndex) setScore((s) => s + 1);
  }

  function next() {
    setValidated(false);
    setSelected(null);
    setIndex((i) => i + 1);
  }

  if (questions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center text-sm text-muted-text">
          {COPY.emptyQuiz}
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <p className="text-lg font-semibold">{COPY.quizDone}</p>
          <p className="mt-2 text-3xl font-bold text-primary-text">
            {score}/{questions.length}
          </p>
          <p className="mt-1 text-sm text-muted-text">bonnes réponses</p>
          <Button
            variant="secondary"
            className="mt-6"
            onClick={() => {
              setIndex(0);
              setSelected(null);
              setValidated(false);
              setScore(0);
              setAnswered(0);
            }}
          >
            Recommencer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Progress value={progress} label={COPY.quizCounter(index + 1, questions.length)} />

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <p className="font-medium leading-relaxed">{question.prompt}</p>
          <div role="radiogroup" aria-label="Réponses" className="flex flex-col gap-2.5">
            {question.options.map((option, i) => {
              const isSelected = selected === i;
              const isCorrect = validated && i === question.correctIndex;
              const isWrongPick = validated && isSelected && i !== question.correctIndex;
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={validated}
                  onClick={() => setSelected(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected && !validated && "border-primary bg-primary-tint",
                    !isSelected && !validated && "border-border bg-surface hover:border-primary/50",
                    isCorrect && "border-success bg-success-tint",
                    isWrongPick && "border-error bg-error-tint",
                    validated &&
                      !isCorrect &&
                      !isWrongPick &&
                      "border-border bg-surface opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      isSelected && !validated && "bg-primary text-on-primary",
                      !isSelected && !validated && "bg-surface-muted text-muted-text",
                      isCorrect && "bg-success text-on-success",
                      isWrongPick && "bg-error text-on-error",
                      validated && !isCorrect && !isWrongPick && "bg-surface-muted text-muted-text",
                    )}
                  >
                    {LETTERS[i]}
                  </span>
                  <span className="text-text">{option}</span>
                </button>
              );
            })}
          </div>

          {validated && (
            <div
              role="status"
              className={cn(
                "rounded-lg px-4 py-3 text-sm",
                selected === question.correctIndex
                  ? "bg-success-tint text-success-text"
                  : "bg-error-tint text-error-text",
              )}
            >
              <p className="font-medium">
                {selected === question.correctIndex ? COPY.quizCorrect : COPY.quizWrong}
              </p>
              {question.explanation && (
                <p className="mt-1 text-text">
                  <span className="font-medium">{COPY.quizExplanation} : </span>
                  {question.explanation}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!validated ? (
        <Button size="lg" className="self-end" disabled={selected === null} onClick={validate}>
          {COPY.quizValidate}
        </Button>
      ) : (
        <Button size="lg" className="self-end" onClick={next}>
          {COPY.quizNext}
        </Button>
      )}
    </div>
  );
}
