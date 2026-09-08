import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { modules, students } from "@/db/schema";
import { DEFAULT_MODULE_NAME } from "@/features/study/constants";

// Lazy student provisioning (spec 0004): upsert on first authenticated
// request of a session. No Clerk webhook dependency in this slice.
// Also provisions the per student default module ("Cours généraux").

export async function requireStudent() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const existing = await db.query.students.findFirst({
    where: eq(students.id, userId),
  });
  if (existing) return existing;

  const cu = await currentUser();
  const email = cu?.primaryEmailAddress?.emailAddress ?? "unknown@pcem.app";

  // Idempotent upsert; onConflictDoNothing covers parallel first requests.
  await db
    .insert(students)
    .values({ id: userId, email })
    .onConflictDoNothing({ target: students.id });

  return (await db.query.students.findFirst({
    where: eq(students.id, userId),
  }))!;
}

export async function ensureDefaultModule(studentId: string): Promise<string> {
  const existing = await db.query.modules.findFirst({
    where: and(eq(modules.studentId, studentId), eq(modules.name, DEFAULT_MODULE_NAME)),
  });
  if (existing) return existing.id;

  const first = await db.query.modules.findFirst({
    where: eq(modules.studentId, studentId),
    orderBy: [modules.position],
  });
  const nextPosition = (first?.position ?? 0) + 1;

  await db
    .insert(modules)
    .values({
      studentId,
      semester: "P1S1",
      name: DEFAULT_MODULE_NAME,
      position: nextPosition,
    })
    .onConflictDoNothing({ target: [modules.studentId, modules.name] });

  return (await db.query.modules.findFirst({
    where: and(eq(modules.studentId, studentId), eq(modules.name, DEFAULT_MODULE_NAME)),
  }))!.id;
}
