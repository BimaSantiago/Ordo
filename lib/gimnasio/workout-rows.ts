import type { ProgressExercise, ProgressSet, ProgressWorkout } from "./progress";

const WORKOUT_EXERCISES_COLUMNS =
  "(id, exercise_id, position, notes, exercises(name, primary_muscle_group), workout_sets(id, position, set_type, weight_kg, reps, rpe, completed))";

/** Select de PostgREST para un entrenamiento con sus ejercicios y series anidados. */
export const WORKOUT_WITH_SETS_SELECT = `id, name, notes, started_at, finished_at, workout_exercises${WORKOUT_EXERCISES_COLUMNS}`;

/**
 * Igual, pero con join interno: permite filtrar por `workout_exercises.exercise_id` y traer
 * solo los entrenamientos (y ejercicios) que coinciden.
 */
export const WORKOUT_WITH_MATCHING_SETS_SELECT = `id, name, notes, started_at, finished_at, workout_exercises!inner${WORKOUT_EXERCISES_COLUMNS}`;

type OneOrMany<T> = T | T[] | null;

type WorkoutRow = {
  id: string;
  name: string | null;
  notes: string | null;
  started_at: string;
  finished_at: string | null;
  workout_exercises: {
    id: string;
    exercise_id: string;
    position: number;
    notes: string | null;
    exercises: OneOrMany<{ name: string; primary_muscle_group: string | null }>;
    workout_sets: {
      id: string;
      position: number;
      set_type: string;
      weight_kg: number | string | null;
      reps: number | null;
      rpe: number | string | null;
      completed: boolean;
    }[];
  }[];
};

export type DetailedSet = ProgressSet & { id: string; position: number; rpe: number | null };

export type DetailedExercise = Omit<ProgressExercise, "sets"> & {
  id: string;
  exerciseName: string;
  position: number;
  notes: string | null;
  sets: DetailedSet[];
};

export type DetailedWorkout = Omit<ProgressWorkout, "exercises"> & {
  name: string | null;
  notes: string | null;
  exercises: DetailedExercise[];
};

function one<T>(value: OneOrMany<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/** `numeric` puede llegar como string según la configuración de PostgREST. */
function toNumber(value: number | string | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function mapWorkoutRow(row: unknown): DetailedWorkout {
  const workout = row as WorkoutRow;
  return {
    id: workout.id,
    name: workout.name,
    notes: workout.notes,
    startedAt: workout.started_at,
    finishedAt: workout.finished_at,
    exercises: (workout.workout_exercises ?? [])
      .map((we) => {
        const exercise = one(we.exercises);
        return {
          id: we.id,
          exerciseId: we.exercise_id,
          exerciseName: exercise?.name ?? "Ejercicio",
          primaryMuscleGroup: exercise?.primary_muscle_group ?? null,
          position: we.position,
          notes: we.notes,
          sets: (we.workout_sets ?? [])
            .map((s) => ({
              id: s.id,
              position: s.position,
              setType: s.set_type,
              weightKg: toNumber(s.weight_kg),
              reps: s.reps,
              rpe: toNumber(s.rpe),
              completed: s.completed,
            }))
            .sort((a, b) => a.position - b.position),
        };
      })
      .sort((a, b) => a.position - b.position),
  };
}
