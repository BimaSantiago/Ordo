"use client";

import { useMemo, useState, useTransition } from "react";
import { translateEquipment, translateMuscleGroup } from "@/lib/exercises";
import { deleteCustomExercise } from "./actions";

type Exercise = {
  id: string;
  name: string;
  primary_muscle_group: string | null;
  equipment: string | null;
  is_custom: boolean;
};

export function ExerciseLibrary({ exercises }: { exercises: Exercise[] }) {
  const [search, setSearch] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [isPending, startTransition] = useTransition();

  const muscleGroups = useMemo(() => {
    const groups = new Set(
      exercises.map((e) => e.primary_muscle_group).filter((g): g is string => !!g)
    );
    return [...groups].sort();
  }, [exercises]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return exercises.filter((e) => {
      const matchesSearch = !term || e.name.toLowerCase().includes(term);
      const matchesGroup = !muscleGroup || e.primary_muscle_group === muscleGroup;
      return matchesSearch && matchesGroup;
    });
  }, [exercises, search, muscleGroup]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ejercicio..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
        />
        <select
          value={muscleGroup}
          onChange={(e) => setMuscleGroup(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-500"
        >
          <option value="">Todos</option>
          {muscleGroups.map((group) => (
            <option key={group} value={group}>
              {translateMuscleGroup(group)}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-slate-400">{filtered.length} ejercicios</p>

      <ul className="space-y-2">
        {filtered.map((exercise) => (
          <li
            key={exercise.id}
            className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5"
          >
            <div className="flex-1">
              <p>{exercise.name}</p>
              <p className="text-xs text-slate-400">
                {translateMuscleGroup(exercise.primary_muscle_group)} ·{" "}
                {translateEquipment(exercise.equipment)}
                {exercise.is_custom && " · personalizado"}
              </p>
            </div>
            {exercise.is_custom && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => deleteCustomExercise(exercise.id))}
                className="text-xs text-red-500"
              >
                Eliminar
              </button>
            )}
          </li>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400">No se encontraron ejercicios.</p>
        )}
      </ul>
    </div>
  );
}
