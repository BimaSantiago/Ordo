"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { ExerciseThumb } from "@/components/exercise/exercise-thumb";
import { ExerciseDetailSheet } from "@/components/exercise/exercise-detail-sheet";
import { translateMuscleGroup, type ExerciseInfo } from "@/lib/exercises";

export function ExercisePicker({
  exercises,
  onAdd,
}: {
  exercises: ExerciseInfo[];
  onAdd: (formData: FormData) => void;
}) {
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<ExerciseInfo | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = term ? exercises.filter((e) => e.name.toLowerCase().includes(term)) : exercises;
    return matches.slice(0, 30);
  }, [exercises, search]);

  return (
    <div className="space-y-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar ejercicio para agregar..."
        className="w-full rounded-lg border border-line px-3 py-2 text-base outline-none focus:border-primary"
      />
      {!search && <p className="text-xs text-muted">Mostrando los primeros 30, escribe para buscar más.</p>}
      <ul className="max-h-80 space-y-1.5 overflow-y-auto overscroll-contain">
        {filtered.map((exercise) => (
          <li key={exercise.id}>
            <form action={onAdd} className="flex items-center gap-2 rounded-xl border border-line bg-surface p-1.5">
              <input type="hidden" name="exercise_id" value={exercise.id} />
              <button
                type="button"
                onClick={() => setDetail(exercise)}
                aria-label={`Ver ${exercise.name}`}
                className="pressable relative shrink-0"
              >
                <ExerciseThumb imagePaths={exercise.image_paths} size="sm" />
                <Info size={14} className="absolute -right-1 -bottom-1 rounded-full bg-surface text-primary" aria-hidden />
              </button>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate">{exercise.name}</p>
                <p className="text-xs text-muted">{translateMuscleGroup(exercise.primary_muscle_group)}</p>
              </div>
              <input
                name="target_sets"
                type="number"
                min={1}
                placeholder="Series"
                aria-label="Series objetivo"
                className="w-16 rounded border border-line px-1 py-1 text-sm"
              />
              <input
                name="target_rep_range"
                placeholder="8-12"
                aria-label="Rango de repeticiones"
                className="w-16 rounded border border-line px-1 py-1 text-sm"
              />
              <button type="submit" className="pressable min-h-10 px-1 text-xs font-semibold text-primary">
                Agregar
              </button>
            </form>
          </li>
        ))}
      </ul>
      <ExerciseDetailSheet exercise={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
