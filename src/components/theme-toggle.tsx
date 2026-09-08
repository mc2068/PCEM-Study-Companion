"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/cn";

const noopSubscribe = () => () => {};
/** True on the client after hydration, false on the server (no effect-setState). */
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

const options = [
  { value: "light", label: "Clair", Icon: Sun },
  { value: "dark", label: "Sombre", Icon: Moon },
  { value: "system", label: "Système", Icon: Monitor },
] as const;

/** Theme switcher (spec 0003 AC-3): system default, manual choice persisted. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) return <div className="h-9 w-[150px]" aria-hidden />;

  return (
    <div
      role="group"
      aria-label="Thème"
      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface p-1"
    >
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            theme === value
              ? "bg-primary-tint text-primary-text"
              : "text-muted-text hover:text-text",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
