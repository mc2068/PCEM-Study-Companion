"use client";

import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type TextareaProps = Omit<ComponentProps<"textarea">, "className"> & {
  label?: string;
  error?: string;
  className?: string;
};

const baseTextarea =
  "min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-disabled-text transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:border-error aria-[invalid=true]:focus-visible:ring-error/30";

/** Textarea sharing the Input tokens; same label/error API. */
export function Textarea({ label, error, className, id: idProp, ...props }: TextareaProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const errorId = `${id}-error`;
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={baseTextarea}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-xs text-error-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
