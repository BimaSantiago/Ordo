"use client";

import dynamic from "next/dynamic";
import { Wrench } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { translateEquipment, type ExerciseInfo } from "@/lib/exercises";
import { ExerciseAnimation } from "./exercise-animation";

// Los trazos SVG del cuerpo pesan ~50 KB: se cargan solo al abrir un detalle, no con la lista.
const MuscleMap = dynamic(() => import("./muscle-map").then((m) => m.MuscleMap), {
  loading: () => <div className="h-56 animate-pulse rounded-2xl bg-surface-2" />,
});

/** Detalle visual de un ejercicio: foto animada, músculos que trabaja y equipo. */
export function ExerciseDetailSheet({
  exercise,
  onClose,
  footer,
}: {
  exercise: ExerciseInfo | null;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <Sheet open={exercise !== null} onClose={onClose} title={exercise?.name ?? ""} footer={exercise ? footer : undefined}>
      {exercise && (
        <div className="space-y-4 pt-2">
          <ExerciseAnimation name={exercise.name} imagePaths={exercise.image_paths} />
          <div className="flex flex-wrap gap-1.5 text-xs font-medium">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1">
              <Wrench size={12} aria-hidden />
              {translateEquipment(exercise.equipment)}
            </span>
            {exercise.is_custom && <span className="rounded-full bg-primary-soft px-2.5 py-1 text-primary">Personalizado</span>}
          </div>
          <MuscleMap primary={exercise.primary_muscle_group} secondaries={exercise.secondary_muscle_groups} />
        </div>
      )}
    </Sheet>
  );
}
