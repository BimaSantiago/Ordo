"use client";

import Body from "react-muscle-highlighter";
import { bodyHighlights, needsSide, translateMuscleGroup } from "@/lib/exercises";

/** Principal = intensidad 1 (naranja), secundarios = intensidad 2 (teal). Tokens CSS para que funcione en modo oscuro. */
const COLORS = ["var(--accent)", "var(--primary)"];

/**
 * Silueta de frente y/o espalda con los músculos que trabaja el ejercicio, más una leyenda en
 * texto para no depender solo del color.
 */
export function MuscleMap({
  primary,
  secondaries,
}: {
  primary: string | null;
  secondaries: string[] | null;
}) {
  const { highlights, mainSide } = bodyHighlights(primary, secondaries);
  const otherSide: "front" | "back" = mainSide === "front" ? "back" : "front";
  // Mostrar la otra vista solo si aporta algo (p. ej. peso muerto: espalda + cuádriceps al frente).
  const sides: ("front" | "back")[] = needsSide(highlights, otherSide) ? [mainSide, otherSide] : [mainSide];
  const secondaryLabels = (secondaries ?? []).filter((m) => m !== primary).map(translateMuscleGroup);

  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-2 rounded-2xl bg-surface-2 p-3">
        {sides.map((side) => (
          <figure key={side} className="flex flex-col items-center gap-1">
            <div className="w-36 [&_svg]:h-auto [&_svg]:w-full">
              <Body
                data={highlights}
                side={side}
                colors={COLORS}
                scale={1}
                border="var(--line)"
                defaultFill="var(--surface)"
                defaultStroke="var(--line)"
                defaultStrokeWidth={1}
              />
            </div>
            <figcaption className="text-xs font-medium text-muted">{side === "front" ? "Frente" : "Espalda"}</figcaption>
          </figure>
        ))}
      </div>

      <div className="space-y-1.5 text-sm">
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-accent" aria-hidden />
          <span className="font-semibold">Principal:</span>
          <span>{translateMuscleGroup(primary)}</span>
        </p>
        {secondaryLabels.length > 0 && (
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-primary" aria-hidden />
            <span className="font-semibold">Secundarios:</span>
            <span>{secondaryLabels.join(", ")}</span>
          </p>
        )}
      </div>
    </div>
  );
}
