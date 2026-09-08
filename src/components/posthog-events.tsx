"use client";

import { useEffect, useRef } from "react";
import { track } from "@/components/posthog";

// Engagement moments (AGENTS.md §7), fired from the slice 1 client surfaces.

export function GenerationCompleted({ ready }: { ready: boolean }) {
  const fired = useRef(false);
  useEffect(() => {
    if (ready && !fired.current) {
      fired.current = true;
      track("generation_completed");
    }
  }, [ready]);
  return null;
}

export function LectureUploaded() {
  useEffect(() => {
    track("lecture_uploaded");
  }, []);
  return null;
}

export function ReviewCompleted({ done }: { done: boolean }) {
  const fired = useRef(false);
  useEffect(() => {
    if (done && !fired.current) {
      fired.current = true;
      track("review_completed");
    }
  }, [done]);
  return null;
}
