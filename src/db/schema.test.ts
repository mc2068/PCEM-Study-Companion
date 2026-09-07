import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { students } from "./schema";

describe("db schema", () => {
  it("exposes the students table keyed by the Clerk user id", () => {
    expect(getTableName(students)).toBe("students");
    expect(students.id.primary).toBe(true);
  });
});
