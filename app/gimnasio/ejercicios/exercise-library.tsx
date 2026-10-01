"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronRight, Search, Trash2 } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { ExerciseThumb } from "@/components/exercise/exercise-thumb";
import { ExerciseDetailSheet } from "@/components/exercise/exercise-detail-sheet";
import { translateEquipment, translateMuscleGroup, type ExerciseInfo } from "@/lib/exercises";
import { deleteCustomExercise } from "./actions";

export function ExerciseLibrary({ exercises }: { exercises: ExerciseInfo[] }) {
  const [search, setSearch] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [selected, setSelected] = useState<ExerciseInfo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const muscleGroups = useMemo(() => {
    const groups = new Set(exercises.map((e) => e.primary_muscle_group).filter((g): g is string => !!g));
    return [...groups].sort((a, b) => translateMuscleGroup(a).localeCompare(translateMuscleGroup(b)));
  }, [exercises]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return exercises.filter((e) => {
      const matchesSearch = !term || e.name.toLowerCase().includes(term);
      const matchesGroup = !muscleGroup || e.primary_muscle_group === muscleGroup;
      return matchesSearch && matchesGroup;
    });
  }, [exercises, search, muscleGroup]);

  function open(exercise: ExerciseInfo) {
    setConfirmDelete(false);
    setSelected(exercise);
  }

  return (
    <div className="space-y-3">
      <label className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-primary">
        <Search size={18} className="text-muted" aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ejercicio..."
          aria-label="Buscar ejercicio"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent outline-none"
        />
      </label>

      <div className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none]">
        <Chip selected={muscleGroup === ""} onClick={() => setMuscleGroup("")}>
          Todos
        </Chip>
        {muscleGroups.map((group) => (
          <Chip key={group} selected={muscleGroup === group} onClick={() => setMuscleGroup(group)}>
            {translateMuscleGroup(group)}
          </Chip>
        ))}
      </div>

      <p className="text-xs text-muted">{filtered.length} ejercicios</p>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {filtered.map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              onClick={() => open(exercise)}
              className="pressable flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left"
            >
              <ExerciseThumb imagePaths={exercise.image_paths} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{exercise.name}</span>
                <span className="block truncate text-xs text-muted">
                  {translateMuscleGroup(exercise.primary_muscle_group)} · {translateEquipment(exercise.equipment)}
                  {exercise.is_custom && " · personalizado"}
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="px-4 py-5 text-center text-sm text-muted">No se encontraron ejercicios.</li>}
      </ul>

      <ExerciseDetailSheet
        exercise={selected}
        onClose={() => setSelected(null)}
        footer={
          selected?.is_custom ? (
            <Button
              variant="danger"
              block
              disabled={isPending}
              onClick={() => {
                if (!confirmDelete) return setConfirmDelete(true);
                const id = selected.id;
                startTransition(async () => {
                  await deleteCustomExercise(id);
                  setSelected(null);
                });
              }}
            >
              <Trash2 size={18} aria-hidden />
              {confirmDelete ? "¿Seguro? Toca de nuevo para eliminar" : "Eliminar ejercicio personalizado"}
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
