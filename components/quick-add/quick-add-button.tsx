"use client";

import type { ReactNode } from "react";
import { useQuickAdd, type QuickAddPrefill } from "./quick-add-provider";
import { cn } from "@/lib/cn";

/** Abre el panel rápido con valores ya llenados, para usarlo desde Server Components. */
export function QuickAddButton({
  prefill,
  children,
  className,
  "aria-label": ariaLabel,
}: {
  prefill: QuickAddPrefill;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const { open } = useQuickAdd();
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => open(prefill)}
      className={cn("pressable inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-primary", className)}
    >
      {children}
    </button>
  );
}
