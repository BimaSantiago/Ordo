"use client";

import { useTransition } from "react";
import { moveRoutineExercise, removeRoutineExercise } from "./actions";

type RoutineExercise = {
  id: string;
  target_sets: number | null;
  target_rep_range: string | null;
  exercises: { name: string }[] | { name: string } | null;
};

function exerciseName(exercises: RoutineExercise["exercises"]): string {
  if (!exercises) return "Ejercicio";
  return Array.isArray(exercises) ? exercises[0]?.name ?? "Ejercicio" : exercises.name;
}

export function RoutineExerciseList({
  routineId,
  items,
}: {
  routineId: string;
  items: RoutineExercise[];
}) {
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return <p className="text-sm text-muted">Aún no tienes ejercicios en esta rutina.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5"
        >
          <div className="flex-1">
            <p>{exerciseName(item.exercises)}</p>
            <p className="text-xs text-muted">
              {item.target_sets ? `${item.target_sets} series` : "Series libres"}
              {item.target_rep_range ? ` · ${item.target_rep_range} reps` : ""}
            </p>
          </div>
          <button
            type="button"
            disabled={isPending || index === 0}
            onClick={() => startTransition(() => moveRoutineExercise(routineId, item.id, "up"))}
            className="text-muted disabled:text-muted"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={isPending || index === items.length - 1}
            onClick={() => startTransition(() => moveRoutineExercise(routineId, item.id, "down"))}
            className="text-muted disabled:text-muted"
          >
            ↓
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => removeRoutineExercise(item.id))}
            className="text-xs text-danger"
          >
            Quitar
          </button>
        </li>
      ))}
    </ul>
  );
}
