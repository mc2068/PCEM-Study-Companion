import { cn } from "@/lib/cn";

type ProgressProps = {
  /** 0 to 100; omit for the indeterminate processing pulse. */
  value?: number | null;
  /** French label slot, e.g. «12 / 40». */
  label?: string;
  className?: string;
};

/** Progress: linear, hand-rolled per spec 0003; indeterminate pulse while processing. */
export function Progress({ value, label, className }: ProgressProps) {
  const indeterminate = value === undefined || value === null || Number.isNaN(value);
  const clamped = indeterminate ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-xs text-muted-text">
          <span>{label}</span>
          {!indeterminate ? <span>{Math.round(clamped)}%</span> : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clamped}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-[width] duration-200",
            indeterminate && "w-1/3 animate-indeterminate",
          )}
          style={indeterminate ? undefined : { width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
