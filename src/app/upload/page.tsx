import type { Metadata } from "next";
import { requireStudent } from "@/features/study/student";
import { getModulesForStudent } from "@/features/study/queries";
import { UploadForm } from "@/features/study/upload-form";
import { COPY } from "@/features/study/constants";
import { BottomNav } from "@/components/bottom-nav";

export const metadata: Metadata = { title: `${COPY.uploadTitle} · ${COPY.appName}` };
export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const student = await requireStudent();
  const modules = await getModulesForStudent(student.id);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-24 pt-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{COPY.uploadTitle}</h1>
        <p className="mt-1 text-sm text-muted-text">{COPY.newLectureCta}</p>
      </header>
      <div className="mt-6">
        <UploadForm modules={modules.map((m) => ({ id: m.id, name: m.name }))} />
      </div>
      <BottomNav />
    </div>
  );
}
