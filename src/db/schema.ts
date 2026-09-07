import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Minimal pipe-proof table for the stack scaffold (scope row 1).
// The complete data model gets its own /architect decision (scope row 3)
// before slice 1 builds on it — spec 0001, Follow-up.
export const students = pgTable("students", {
  // Clerk user id — the single identity key across the whole app.
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
