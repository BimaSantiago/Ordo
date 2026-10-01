"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { ExerciseThumb } from "@/components/exercise/exercise-thumb";
import { ExerciseDetailSheet } from "@/components/exercise/exercise-detail-sheet";
import type { ExerciseInfo } from "@/lib/exercises";
import {
  clearActiveDraft,
  createDraft,
  createDraftExercise,
  createDraftSet,
  getActiveDraft,
  saveActiveDraft,
  type DraftExercise,
  type WorkoutDraft,
} from "@/lib/gimnasio/workout-draft";
import { calculateElapsedSeconds, calculateWorkoutVolume, countCompletedSets, formatElapsed } from "@/lib/gimnasio/live-stats";
import { formatRecordValue, RECORD_LABELS } from "@/lib/gimnasio/records";
import { finishWorkout, getPreviousExerciseSets, type BrokenRecord, type PreviousSet } from "./actions";
import { RestTimer } from "./rest-timer";
import { SetRow } from "./set-row";

type RoutineOption = {
  id: string;
  name: string;
  routine_exercises: {
    exercise_id: string;
    target_sets: number | null;
    exercises: { name: string }[] | { name: string } | null;
  }[];
};

type ExerciseOption = ExerciseInfo;

function exerciseName(exercises: RoutineOption["routine_exercises"][number]["exercises"]): string {
  if (!exercises) return "Ejercicio";
  return Array.isArray(exercises) ? exercises[0]?.name ?? "Ejercicio" : exercises.name;
}

function previousLabel(sets: PreviousSet[] | undefined): string {
  if (!sets || sets.length === 0) return "Sin sesión anterior";
  return sets.map((s) => `${s.weightKg ?? "-"}kg×${s.reps ?? "-"}`).join(", ");
}

export function WorkoutSession({
  routines,
  exercises,
}: {
  routines: RoutineOption[];
  exercises: ExerciseOption[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<WorkoutDraft | null | undefined>(undefined);
  const [previousByExercise, setPreviousByExercise] = useState<Record<string, PreviousSet[]>>({});
  const [, setTick] = useState(0);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [brokenRecords, setBrokenRecords] = useState<BrokenRecord[] | null>(null);
  const [detail, setDetail] = useState<ExerciseInfo | null>(null);
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  useEffect(() => {
    getActiveDraft().then((d) => setDraft(d ?? null));
  }, []);

  useEffect(() => {
    if (!draft) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
    // Solo reinicia el intervalo cuando cambia el entrenamiento en curso, no en cada tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

  useEffect(() => {
    if (draft) void saveActiveDraft(draft);
  }, [draft]);

  useEffect(() => {
    if (!draft) return;
    draft.exercises.forEach((exercise) => {
      if (previousByExercise[exercise.exerciseId] !== undefined) return;
      getPreviousExerciseSets(exercise.exerciseId).then((sets) => {
        setPreviousByExercise((prev) => ({ ...prev, [exercise.exerciseId]: sets }));
      });
    });
  }, [draft, previousByExercise]);

  const elapsed = draft ? calculateElapsedSeconds(draft.startedAt) : 0;
  const volume = draft ? calculateWorkoutVolume(draft.exercises) : 0;
  const completedSets = draft ? countCompletedSets(draft.exercises) : 0;

  const filteredExercises = useMemo(() => {
    const term = exerciseSearch.trim().toLowerCase();
    const matches = term ? exercises.filter((e) => e.name.toLowerCase().includes(term)) : exercises;
    return matches.slice(0, 20);
  }, [exercises, exerciseSearch]);

  if (draft === undefined) {
    return <p className="text-sm text-muted">Cargando...</p>;
  }

  if (draft === null && brokenRecords !== null) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-success-soft px-3 py-2 text-sm font-medium text-success">
          Entrenamiento guardado
        </p>
        {brokenRecords.length > 0 && (
          <ul className="space-y-1.5 rounded-lg border border-accent/40 bg-accent/10 p-3">
            {brokenRecords.map((record) => (
              <li key={`${record.exerciseName}-${record.recordType}`} className="flex items-start gap-2 text-sm text-fg">
                <Trophy size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                <span>
                  Nuevo récord: {record.exerciseName}, {RECORD_LABELS[record.recordType].toLowerCase()}{" "}
                  {formatRecordValue(record.recordType, record.value)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/gimnasio/progreso")}
            className="flex-1 rounded-lg bg-primary px-4 py-3 text-base font-medium text-on-primary"
          >
            Ver progreso
          </button>
          <button
            type="button"
            onClick={() => setBrokenRecords(null)}
            className="flex-1 rounded-lg border border-line px-4 py-3 text-base"
          >
            Listo
          </button>
        </div>
      </div>
    );
  }

  if (draft === null) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setDraft(createDraft({}))}
          className="w-full rounded-lg bg-primary px-4 py-3 text-base font-medium text-on-primary"
        >
          Iniciar entrenamiento vacío
        </button>

        {routines.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted">O desde una rutina</p>
            {routines.map((routine) => (
              <button
                key={routine.id}
                type="button"
                onClick={() => {
                  const newDraft = createDraft({ routineId: routine.id, name: routine.name });
                  newDraft.exercises = routine.routine_exercises.map((re, index) => {
                    const draftExercise = createDraftExercise(re.exercise_id, exerciseName(re.exercises), index);
                    const setCount = re.target_sets ?? 3;
                    draftExercise.sets = Array.from({ length: setCount }, (_, i) => createDraftSet(i));
                    return draftExercise;
                  });
                  setDraft(newDraft);
                }}
                className="block w-full rounded-lg border border-line px-3 py-2.5 text-left"
              >
                {routine.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function updateExercise(exerciseId: string, updater: (exercise: DraftExercise) => DraftExercise) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((e) => (e.id === exerciseId ? updater(e) : e)),
      };
    });
  }

  function removeExercise(exerciseId: string) {
    setDraft((prev) => (prev ? { ...prev, exercises: prev.exercises.filter((e) => e.id !== exerciseId) } : prev));
  }

  function addExercise(option: ExerciseOption) {
    setDraft((prev) => {
      if (!prev) return prev;
      const newExercise = createDraftExercise(option.id, option.name, prev.exercises.length);
      return { ...prev, exercises: [...prev.exercises, newExercise] };
    });
    setExerciseSearch("");
  }

  async function finish() {
    if (!draft) return;
    setIsFinishing(true);
    setFinishError(null);
    try {
      const result = await finishWorkout(draft);
      if (!result.ok) {
        setFinishError("No se pudo guardar; tu entrenamiento sigue aquí. Intenta de nuevo.");
        return;
      }
      // El borrador local solo se borra cuando el servidor confirmó el guardado.
      await clearActiveDraft();
      setDraft(null);
      setBrokenRecords(result.newRecords);
    } catch {
      setFinishError("Sin conexión; tu entrenamiento sigue aquí. Intenta de nuevo con señal.");
    } finally {
      setIsFinishing(false);
    }
  }

  return (
    <div className="space-y-4">
      {finishError && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {finishError}
        </p>
      )}

      <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
        <div>
          <p className="text-lg font-semibold">{formatElapsed(elapsed)}</p>
          <p className="text-xs text-muted">
            {completedSets} series · {volume.toFixed(0)} kg volumen
          </p>
        </div>
        <button
          type="button"
          disabled={isFinishing}
          onClick={finish}
          className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
        >
          Finalizar
        </button>
      </div>

      <RestTimer />

      <div className="space-y-4">
        {draft.exercises.map((exercise) => (
          <div key={exercise.id} className="space-y-2 rounded-lg border border-line p-3">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const info = exerciseById.get(exercise.exerciseId);
                  if (info) setDetail(info);
                }}
                aria-label={`Ver técnica de ${exercise.exerciseName}`}
                className="pressable shrink-0"
              >
                <ExerciseThumb imagePaths={exerciseById.get(exercise.exerciseId)?.image_paths ?? null} size="sm" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{exercise.exerciseName}</p>
                <p className="text-xs text-muted">
                  Anterior: {previousLabel(previousByExercise[exercise.exerciseId])}
                </p>
              </div>
              <button type="button" onClick={() => removeExercise(exercise.id)} className="text-xs text-danger">
                Quitar
              </button>
            </div>

            <div className="space-y-1.5">
              {exercise.sets.map((set) => (
                <SetRow
                  key={set.id}
                  set={set}
                  onChange={(updated) =>
                    updateExercise(exercise.id, (e) => ({
                      ...e,
                      sets: e.sets.map((s) => (s.id === updated.id ? updated : s)),
                    }))
                  }
                  onRemove={() =>
                    updateExercise(exercise.id, (e) => ({
                      ...e,
                      sets: e.sets.filter((s) => s.id !== set.id),
                    }))
                  }
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                updateExercise(exercise.id, (e) => ({
                  ...e,
                  sets: [...e.sets, createDraftSet(e.sets.length)],
                }))
              }
              className="text-sm text-muted"
            >
              + Serie
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-lg border border-line p-3">
        <p className="text-sm font-medium text-muted">Agregar ejercicio</p>
        <input
          value={exerciseSearch}
          onChange={(e) => setExerciseSearch(e.target.value)}
          placeholder="Buscar ejercicio..."
          className="w-full rounded-lg border border-line px-3 py-2 text-base outline-none focus:border-primary"
        />
        {exerciseSearch && (
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {filteredExercises.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => addExercise(option)}
                  className="pressable flex w-full items-center gap-2 rounded-xl border border-line bg-surface p-1.5 text-left text-sm"
                >
                  <ExerciseThumb imagePaths={option.image_paths} size="sm" />
                  <span className="truncate">{option.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ExerciseDetailSheet exercise={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
