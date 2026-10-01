import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Opción seleccionable (día, materia, recordatorio...). `color` dibuja el punto de la materia. */
export function Chip({
  selected = false,
  color,
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; color?: string | null }) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "pressable inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium",
        selected ? "border-primary bg-primary text-on-primary" : "border-line bg-surface text-fg",
        className
      )}
      {...props}
    >
      {color && (
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-full ring-1 ring-white/60"
          style={{ backgroundColor: color }}
        />
      )}
      {children}
    </button>
  );
}
