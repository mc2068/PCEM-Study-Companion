"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import { createUploadAction, finalizeUploadAction } from "@/features/study/actions";
import { COPY, MAX_FILE_SIZE_BYTES } from "@/features/study/constants";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LectureUploaded } from "@/components/posthog-events";

type ModuleOption = { id: string; name: string };

export function UploadForm({ modules }: { modules: ModuleOption[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [moduleId, setModuleId] = useState<string>(modules[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const pending = busy;

  function pick(f: File | null) {
    setError(null);
    if (!f) return setFile(null);
    if (!/\.pdf$/i.test(f.name)) return setError(COPY.errNotPdf);
    if (f.size > MAX_FILE_SIZE_BYTES) return setError(COPY.errTooBig);
    setFile(f);
  }

  async function handleSubmit() {
    if (!file) return;
    setError(null);
    const result = await createUploadAction({
      fileName: file.name,
      fileSizeBytes: file.size,
      moduleId: moduleId || null,
    });
    if (!result.ok) return setError(result.error);

    // Direct to storage: bytes never pass through our server (spec 0001).
    const put = await fetch(result.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: file,
    });
    if (!put.ok) {
      setError(COPY.errGeneric);
      return;
    }

    startTransition(async () => {
      const done = await finalizeUploadAction({ lectureId: result.lectureId });
      if (!done.ok) {
        setError(done.error);
        return;
      }
      setUploaded(true); // engagement moment: lecture_uploaded (AGENTS.md §7)
      router.push(`/lectures/${result.lectureId}`);
    });
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={COPY.uploadDropzone}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pick(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          dragOver
            ? "border-primary bg-primary-tint"
            : "border-border bg-surface hover:border-primary/50 hover:bg-primary-tint/40"
        }`}
      >
        {file ? (
          <CheckCircle2 className="size-10 text-success-text" aria-hidden />
        ) : (
          <UploadCloud className="size-10 text-muted-text" aria-hidden />
        )}
        <div>
          <p className="font-medium">{file ? file.name : COPY.uploadDropzone}</p>
          <p className="mt-1 text-sm text-muted-text">
            {file ? "Prêt à envoyer" : COPY.uploadBrowse}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <Select
          label={COPY.uploadModuleLabel}
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value)}
          className="flex-1"
        >
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
        <Badge variant="neutral" className="mb-2.5 self-start sm:self-auto">
          P1 · Semestre 1
        </Badge>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-error-tint px-3 py-2 text-sm text-error-text">
          {error}
        </p>
      )}

      {pending && (
        <p role="status" className="flex items-center justify-center gap-2 text-sm text-muted-text">
          {COPY.uploadProcessing}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!file || pending}
        isLoading={pending}
        className="w-full"
      >
        {COPY.uploadSubmit}
      </Button>

      <p className="text-xs leading-relaxed text-muted-text">{COPY.disclosure}</p>
      {uploaded && <LectureUploaded />}
    </form>
  );
}
