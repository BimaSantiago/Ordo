"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { moveRoutineExercise, removeRoutineExercise, updateRoutineExercise } from "./actions";

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

export function RoutineExerciseList({ routineId, items }: { routineId: string; items: RoutineExercise[] }) {
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return <p className="text-sm text-muted">Aún no tienes ejercicios en esta rutina.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={item.id} className="space-y-2 rounded-2xl border border-line bg-surface p-3">
          <div className="flex items-center gap-1">
            <p className="min-w-0 flex-1 truncate font-medium">{exerciseName(item.exercises)}</p>
            <IconButton
              aria-label={`Subir ${exerciseName(item.exercises)}`}
              disabled={isPending || index === 0}
              onClick={() => startTransition(() => moveRoutineExercise(routineId, item.id, "up"))}
              className="disabled:opacity-30"
            >
              <ChevronUp size={20} aria-hidden />
            </IconButton>
            <IconButton
              aria-label={`Bajar ${exerciseName(item.exercises)}`}
              disabled={isPending || index === items.length - 1}
              onClick={() => startTransition(() => moveRoutineExercise(routineId, item.id, "down"))}
              className="disabled:opacity-30"
            >
              <ChevronDown size={20} aria-hidden />
            </IconButton>
            <IconButton
              aria-label={`Quitar ${exerciseName(item.exercises)}`}
              disabled={isPending}
              onClick={() => startTransition(() => removeRoutineExercise(item.id))}
              className="text-danger"
            >
              <Trash2 size={18} aria-hidden />
            </IconButton>
          </div>
          <TargetFields key={`${item.target_sets}-${item.target_rep_range}`} item={item} />
        </li>
      ))}
    </ul>
  );
}

/** Series y rango de repeticiones editables; se guardan al salir del campo. */
function TargetFields({ item }: { item: RoutineExercise }) {
  const [sets, setSets] = useState(item.target_sets?.toString() ?? "");
  const [reps, setReps] = useState(item.target_rep_range ?? "");
  const [isPending, startTransition] = useTransition();

  function save() {
    const targetSets = sets === "" ? null : Number(sets);
    const targetRepRange = reps.trim() || null;
    if (targetSets === item.target_sets && targetRepRange === item.target_rep_range) return;
    startTransition(() => updateRoutineExercise({ routineExerciseId: item.id, targetSets, targetRepRange }));
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          onBlur={save}
          placeholder="—"
          aria-label="Series objetivo"
          className="min-h-11 w-14 rounded-xl border border-line bg-surface text-center tabular-nums outline-none focus:border-primary"
        />
        <span className="text-muted">series</span>
      </label>
      <span className="text-muted">×</span>
      <label className="flex items-center gap-1.5">
        <input
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onBlur={save}
          placeholder="8-12"
          aria-label="Rango de repeticiones"
          className="min-h-11 w-20 rounded-xl border border-line bg-surface text-center tabular-nums outline-none focus:border-primary"
        />
        <span className="text-muted">reps</span>
      </label>
      {isPending && <span className="text-xs text-muted">Guardando…</span>}
    </div>
  );
}
