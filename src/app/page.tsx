import Link from "next/link";
import { Flame, Plus, BookOpen, Library, ClipboardList, User } from "lucide-react";
import { requireStudent } from "@/features/study/student";
import { reapStuckLectures } from "@/features/study/pipeline";
import { getHomeData } from "@/features/study/queries";
import { COPY } from "@/features/study/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const stateStyles: Record<string, string> = {
  uploaded: "bg-surface-muted text-muted-text",
  processing: "bg-accent-tint text-accent-text",
  ready: "bg-success-tint text-success-text",
  failed: "bg-error-tint text-error-text",
};

const stateCopy = {
  uploaded: COPY.stateUploaded,
  processing: COPY.stateProcessing,
  ready: COPY.stateReady,
  failed: COPY.stateFailed,
} as const;

export default async function HomePage() {
  const student = await requireStudent();
  await reapStuckLectures(student.id);
  const { lectures, dueCount, streakDays, modules } = await getHomeData(
    student.id,
    student.timezone,
  );

  const firstReady = lectures.find((l) => l.processingState === "ready");
  const reviseHref = firstReady ? `/lectures/${firstReady.id}?tab=flashcards` : "/upload";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-24 pt-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-text">{COPY.homeGreeting}</p>
          <h1 className="text-2xl font-bold tracking-tight">{COPY.homeTitle}</h1>
        </div>
        {streakDays > 0 && (
          <Badge variant="warning" className="gap-1">
            <Flame className="size-3.5" aria-hidden />
            {streakDays} {COPY.streakLabel}
          </Badge>
        )}
      </header>

      <Card className="mt-6 border-primary/20 bg-primary-tint shadow-rest">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-medium text-primary-text">{COPY.cardsDueLabel}</p>
            <p className="text-4xl font-bold text-primary-text">{dueCount}</p>
          </div>
          <Button
            variant="secondary"
            className="bg-success text-on-success hover:bg-success-hover"
            href={reviseHref}
          >
            {dueCount > 0 ? "Réviser" : "Ajouter un cours"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-tint text-primary-text">
              <Plus className="size-5" aria-hidden />
            </span>
            <p className="font-medium">{COPY.newLectureCta}</p>
          </div>
          <Button href="/upload">{COPY.uploadTitle}</Button>
        </CardContent>
      </Card>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-text">Mes cours</h2>
        {lectures.length === 0 ? (
          <Card className="mt-3 border-dashed">
            <CardContent className="p-6 text-center">
              <BookOpen className="mx-auto size-8 text-muted-text" aria-hidden />
              <p className="mt-3 font-medium">{COPY.noLecturesTitle}</p>
              <p className="mt-1 text-sm text-muted-text">{COPY.noLecturesBody}</p>
              <Button href="/upload" className="mt-4">
                {COPY.uploadTitle}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="mt-3 space-y-3">
            {lectures.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/lectures/${l.id}`}
                  className="block rounded-xl shadow-rest transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{l.title}</p>
                        <p className="mt-0.5 text-xs text-muted-text">
                          {l.moduleName}
                          {l.totalChunks > 0 && ` · ${l.processedChunks}/${l.totalChunks}`}
                        </p>
                        {l.processingState === "processing" && l.totalChunks > 0 && (
                          <Progress
                            value={Math.round((l.processedChunks / l.totalChunks) * 100)}
                            className="mt-2"
                            label={`${l.processedChunks}/${l.totalChunks}`}
                          />
                        )}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                          stateStyles[l.processingState],
                        )}
                      >
                        {stateCopy[l.processingState]}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modules.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-text">
            Matières
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {modules.map((m) => (
              <Badge key={m.id} variant="neutral">
                {m.name}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const items = [
    { href: "/", label: COPY.navHome, icon: BookOpen, active: true },
    { href: "#", label: COPY.navLibrary, icon: Library, active: false },
    { href: "#", label: COPY.navExams, icon: ClipboardList, active: false },
    { href: "#", label: COPY.navProfile, icon: User, active: false },
  ];
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => (
          <li key={item.label} className="flex-1">
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                item.active ? "text-primary-text" : "text-muted-text hover:text-text",
              )}
            >
              <item.icon className={cn("size-5", item.active && "text-primary")} aria-hidden />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
