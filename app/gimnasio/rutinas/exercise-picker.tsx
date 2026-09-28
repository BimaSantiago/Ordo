"use client";

import { useMemo, useState } from "react";
import { translateMuscleGroup } from "@/lib/exercises";

type Exercise = { id: string; name: string; primary_muscle_group: string | null };

export function ExercisePicker({
  exercises,
  onAdd,
}: {
  exercises: Exercise[];
  onAdd: (formData: FormData) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = term
      ? exercises.filter((e) => e.name.toLowerCase().includes(term))
      : exercises;
    return matches.slice(0, 30);
  }, [exercises, search]);

  return (
    <div className="space-y-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar ejercicio para agregar..."
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
      />
      {!search && (
        <p className="text-xs text-slate-400">Mostrando los primeros 30, escribe para buscar más.</p>
      )}
      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {filtered.map((exercise) => (
          <li key={exercise.id}>
            <form action={onAdd} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
              <input type="hidden" name="exercise_id" value={exercise.id} />
              <div className="flex-1 text-sm">
                <p>{exercise.name}</p>
                <p className="text-xs text-slate-400">{translateMuscleGroup(exercise.primary_muscle_group)}</p>
              </div>
              <input
                name="target_sets"
                type="number"
                min={1}
                placeholder="Series"
                className="w-16 rounded border border-slate-300 px-1 py-1 text-sm"
              />
              <input
                name="target_rep_range"
                placeholder="8-12"
                className="w-16 rounded border border-slate-300 px-1 py-1 text-sm"
              />
              <button type="submit" className="text-xs font-medium text-slate-900">
                Agregar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
