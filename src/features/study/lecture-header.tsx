"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { retryLectureAction } from "@/features/study/actions";
import { COPY, PROGRESS_POLL_MS } from "@/features/study/constants";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

// Lecture header: title, state banner, progress with 5 s polling while
// processing (spec 0004 AC-7), retry action on failure (AC-6).

type State = "uploaded" | "processing" | "ready" | "failed";

export function LectureHeader({
  lectureId,
  title,
  moduleName,
  state,
  processed,
  total,
  errorMessage,
}: {
  lectureId: string;
  title: string;
  moduleName: string;
  state: State;
  processed: number;
  total: number;
  errorMessage?: string | null;
}) {
  const router = useRouter();
  const live = state === "processing" || state === "uploaded";

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => router.refresh(), PROGRESS_POLL_MS);
    return () => clearInterval(t);
  }, [live, router]);

  async function retry() {
    await retryLectureAction({ lectureId });
    router.refresh();
  }

  return (
    <header>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-text">{moduleName}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>

      {live && (
        <div className="mt-4 rounded-xl bg-surface-muted p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
            {COPY.stateProcessing}
          </p>
          {total > 0 ? (
            <>
              <Progress
                value={Math.round((processed / total) * 100)}
                className="mt-3"
                label={`${processed}/${total}`}
              />
              <p className="mt-1.5 text-xs text-muted-text">{COPY.progressLabel}</p>
            </>
          ) : (
            <p className="mt-1.5 text-xs text-muted-text">{COPY.progressLabel}</p>
          )}
        </div>
      )}

      {state === "failed" && (
        <div className="mt-4 rounded-xl bg-error-tint p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-error-text">
            <AlertTriangle className="size-4" aria-hidden />
            {COPY.stateFailed}
          </p>
          {errorMessage && (
            <p className="mt-1 text-sm text-error-text" role="alert">
              {errorMessage}
            </p>
          )}
          <Button size="sm" className="mt-3" onClick={() => void retry()}>
            {COPY.retryAction}
          </Button>
        </div>
      )}
    </header>
  );
}
