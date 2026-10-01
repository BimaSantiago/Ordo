/* eslint-disable @next/next/no-img-element -- miniaturas de un CDN externo con carga perezosa nativa. */
import { Dumbbell } from "lucide-react";
import { exerciseImageUrl } from "@/lib/exercises";
import { cn } from "@/lib/cn";

/** Miniatura fija (foto inicial) para listas largas: carga perezosa, sin animación, para ahorrar datos. */
export function ExerciseThumb({
  imagePaths,
  size = "md",
  className,
}: {
  imagePaths: string[] | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const box = size === "sm" ? "h-10 w-10" : "h-14 w-14";
  const first = imagePaths?.[0];

  if (!first) {
    return (
      <span className={cn(box, "flex shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted", className)} aria-hidden>
        <Dumbbell size={size === "sm" ? 16 : 20} />
      </span>
    );
  }

  return (
    <img
      src={exerciseImageUrl(first)}
      alt=""
      width={56}
      height={56}
      loading="lazy"
      decoding="async"
      className={cn(box, "shrink-0 rounded-xl bg-white object-cover", className)}
    />
  );
}
