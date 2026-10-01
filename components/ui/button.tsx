import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary",
  accent: "bg-accent text-on-accent",
  secondary: "border border-line bg-surface text-fg",
  ghost: "text-muted",
  danger: "bg-danger-soft text-danger",
};

export function Button({
  variant = "primary",
  block = false,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean }) {
  return (
    <button
      type={type}
      className={cn(
        "pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold disabled:opacity-50",
        VARIANTS[variant],
        block && "w-full",
        className
      )}
      {...props}
    />
  );
}
