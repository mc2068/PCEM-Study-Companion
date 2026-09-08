import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type BaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = BaseProps &
  Omit<ComponentProps<"button">, keyof BaseProps> & { href?: undefined };

type ButtonAsLink = BaseProps & {
  href: string;
  disabled?: boolean;
  "aria-label"?: string;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  accent: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "border border-border bg-surface-muted text-text hover:bg-border/50",
  ghost: "text-primary-text hover:bg-primary-tint",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
  md: "h-10 gap-2 rounded-md px-4 text-sm",
  lg: "h-12 gap-2 rounded-lg px-6 text-base",
};

const base =
  "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Button, primary/accent/secondary/ghost; polymorphic to Next Link via href. */
export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", size = "md", isLoading = false, className, children } = props;
  const classes = cn(
    base,
    variants[variant],
    sizes[size],
    isLoading && "pointer-events-none",
    props.disabled && "pointer-events-none bg-disabled-bg text-disabled-text",
    className,
  );
  const spinner = isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null;

  if ("href" in props && props.href) {
    const { href, disabled, "aria-label": ariaLabel } = props;
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        aria-disabled={disabled || isLoading || undefined}
        aria-busy={isLoading || undefined}
        className={cn(classes, (disabled || isLoading) && "text-disabled-text")}
      >
        {spinner}
        {children}
      </Link>
    );
  }

  const { disabled, ...rest } = props as ButtonAsButton;
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={classes}
      {...rest}
    >
      {spinner}
      {children}
    </button>
  );
}
