"use client";

import posthog from "posthog-js";

// PostHog runs in the browser with the public key only (AGENTS.md §5).
export function initPostHog() {
  if (typeof window === "undefined") return null;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!posthog.__loaded) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      capture_pageview: false,
    });
  }
  return posthog;
}

export function track(event: string) {
  const client = initPostHog();
  client?.capture(event);
}
