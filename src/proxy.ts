import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes: Clerk's own auth pages, the health probe, and the QStash
// pipeline webhook (it authenticates via its own signature verification,
// spec 0004). Everything else requires a signed-in student (AC-1).
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/api/pipeline/qstash(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
