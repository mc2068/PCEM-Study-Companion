"use client";

import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type InputProps = Omit<ComponentProps<"input">, "className"> & {
  label?: string;
  error?: string;
  className?: string;
};

const baseInput =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-disabled-text transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:border-error aria-[invalid=true]:focus-visible:ring-error/30";

/** Input with optional French-ready label and error message (wired to aria). */
export function Input({ label, error, className, id: idProp, ...props }: InputProps) {
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
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={baseInput}
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
