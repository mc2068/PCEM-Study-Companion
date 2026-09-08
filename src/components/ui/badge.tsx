import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "primary" | "success" | "warning" | "danger" | "neutral";

const variants: Record<BadgeVariant, string> = {
  primary: "bg-primary-tint text-primary-text",
  success: "bg-success-tint text-success-text",
  warning: "bg-accent-tint text-accent-text",
  danger: "bg-error-tint text-error-text",
  neutral: "bg-surface-muted text-muted-text",
};

/** Badge: tinted background + strong text, pill shape. */
export function Badge({
  variant = "primary",
  className,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
