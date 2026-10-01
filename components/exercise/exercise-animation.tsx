"use client";

/* eslint-disable @next/next/no-img-element -- fotos de un CDN externo ya optimizado; next/image no aporta y gastaría la cuota de optimización. */
import { useState } from "react";
import { Dumbbell, Pause } from "lucide-react";
import { exerciseImageUrl } from "@/lib/exercises";
import { cn } from "@/lib/cn";

/**
 * Posición inicial y final del ejercicio alternando como un GIF (animación CSS en globals.css).
 * Tocar pausa/reanuda; con movimiento reducido se queda en la posición inicial.
 */
export function ExerciseAnimation({
  name,
  imagePaths,
  className,
}: {
  name: string;
  imagePaths: string[] | null;
  className?: string;
}) {
  const [paused, setPaused] = useState(false);
  const [start, end] = imagePaths ?? [];

  if (!start) {
    return (
      <div
        className={cn("flex aspect-[3/2] w-full items-center justify-center rounded-2xl bg-surface-2 text-muted", className)}
        role="img"
        aria-label={`${name}: sin imagen`}
      >
        <Dumbbell size={40} aria-hidden />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPaused((p) => !p)}
      aria-label={paused ? `Reanudar animación de ${name}` : `Pausar animación de ${name}`}
      className={cn("relative block aspect-[3/2] w-full overflow-hidden rounded-2xl bg-white", className)}
    >
      <span className="exercise-anim absolute inset-0 block" data-paused={paused}>
        <img
          src={exerciseImageUrl(start)}
          alt={`${name}, posición inicial`}
          width={850}
          height={567}
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain"
        />
        {end && (
          <img
            src={exerciseImageUrl(end)}
            alt={`${name}, posición final`}
            width={850}
            height={567}
            decoding="async"
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
      </span>
      {paused && (
        <span className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white">
          <Pause size={16} aria-hidden />
        </span>
      )}
    </button>
  );
}
