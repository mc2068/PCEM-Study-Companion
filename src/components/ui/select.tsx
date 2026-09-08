"use client";

import { ChevronDown } from "lucide-react";
import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type SelectProps = Omit<ComponentProps<"select">, "className"> & {
  label?: string;
  error?: string;
  className?: string;
};

const baseSelect =
  "h-10 w-full cursor-pointer appearance-none rounded-md border border-border bg-surface py-0 pl-3 pr-9 text-sm text-text transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text aria-[invalid=true]:border-error";

/** Styled native select (module dropdowns); Radix Select deferred per spec 0003. */
export function Select({ label, error, className, id: idProp, children, ...props }: SelectProps) {
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
      <div className="relative w-full">
        <select id={id} className={baseSelect} {...props}>
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-text"
          aria-hidden
        />
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-error-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
