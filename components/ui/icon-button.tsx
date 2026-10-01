import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Botón solo con icono: `aria-label` es obligatorio porque no hay texto visible. */
export function IconButton({
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label": string }) {
  return (
    <button
      type={type}
      className={cn(
        "pressable inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
