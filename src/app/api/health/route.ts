import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Health endpoint: proves the app is alive. The Supabase keep-alive cron
// (spec 0001 Follow-up) pings this daily so the free project never pauses.
export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "pcem-study-companion",
    time: new Date().toISOString(),
  });
}
