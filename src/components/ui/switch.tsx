"use client";

import * as RadixSwitch from "@radix-ui/react-switch";
import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type SwitchProps = Omit<ComponentProps<typeof RadixSwitch.Root>, "asChild"> & {
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

const track =
  "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-border transition-colors duration-150 data-[state=checked]:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:data-[state=checked]:bg-disabled-bg disabled:bg-disabled-bg";

const thumb =
  "pointer-events-none block rounded-full bg-surface shadow-rest transition-transform duration-150";

/** Switch (Radix): Space/Enter toggle, keyboard operable, optional French label. */
export function Switch({ label, size = "md", className, id: idProp, ...props }: SwitchProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const root = (
    <RadixSwitch.Root
      id={id}
      className={cn(track, size === "sm" ? "h-4 w-7" : "h-5 w-9", className)}
      {...props}
    >
      <RadixSwitch.Thumb
        className={cn(
          thumb,
          size === "sm"
            ? "size-3 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0.5"
            : "size-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5",
        )}
      />
    </RadixSwitch.Root>
  );
  if (!label) return root;
  return (
    <span className="inline-flex items-center gap-2">
      {root}
      <label htmlFor={id} className="text-sm text-text">
        {label}
      </label>
    </span>
  );
}
