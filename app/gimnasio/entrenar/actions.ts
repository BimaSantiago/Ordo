"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WorkoutDraft } from "@/lib/gimnasio/workout-draft";
import { detectNewRecords, recordKey, type CurrentBests, type RecordType } from "@/lib/gimnasio/records";

async function requireUserId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No autenticado");
  return { supabase, userId: data.user.id };
}

export type PreviousSet = {
  weightKg: number | null;
  reps: number | null;
  setType: string;
};

/** Series de la última sesión finalizada en la que se hizo este ejercicio, como referencia. */
export async function getPreviousExerciseSets(exerciseId: string): Promise<PreviousSet[]> {
  const { supabase, userId } = await requireUserId();

  // Se ordena desde `workouts` (no desde la tabla embebida) para que "la última" sea de verdad la más reciente.
  const { data: lastWorkout } = await supabase
    .from("workouts")
    .select("id, workout_exercises!inner(id)")
    .eq("user_id", userId)
    .eq("workout_exercises.exercise_id", exerciseId)
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const workoutExerciseIds = (lastWorkout?.workout_exercises ?? []).map((we: { id: string }) => we.id);
  if (workoutExerciseIds.length === 0) return [];

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("weight_kg, reps, set_type")
    .in("workout_exercise_id", workoutExerciseIds)
    .order("position", { ascending: true });

  return (sets ?? []).map((s) => ({ weightKg: s.weight_kg, reps: s.reps, setType: s.set_type }));
}

export type BrokenRecord = {
  exerciseName: string;
  recordType: RecordType;
  value: number;
};

export type FinishWorkoutResult =
  | { ok: true; newRecords: BrokenRecord[] }
  | { ok: false; error: string };

/**
 * Guarda el entrenamiento completo (workout + ejercicios + series) y registra los récords que rompe.
 * Es idempotente (upserts con los ids del borrador): si falla a medias, el cliente conserva el
 * borrador y puede reintentar sin duplicar datos ni récords.
 */
export async function finishWorkout(draft: WorkoutDraft): Promise<FinishWorkoutResult> {
  const { supabase, userId } = await requireUserId();
  const finishedAt = new Date().toISOString();
  const exerciseIds = [...new Set(draft.exercises.map((e) => e.exerciseId))];

  const { data: existingRecords, error: recordsReadError } = await supabase
    .from("personal_records")
    .select("exercise_id, record_type, value")
    .in("exercise_id", exerciseIds);
  if (recordsReadError) return { ok: false, error: recordsReadError.message };

  const currentBests: CurrentBests = new Map();
  for (const record of existingRecords ?? []) {
    const key = recordKey(record.exercise_id, record.record_type);
    currentBests.set(key, Math.max(currentBests.get(key) ?? 0, Number(record.value)));
  }

  const { error: workoutError } = await supabase.from("workouts").upsert({
    id: draft.workoutId,
    user_id: userId,
    routine_id: draft.routineId,
    name: draft.name,
    started_at: draft.startedAt,
    finished_at: finishedAt,
    notes: draft.notes,
  });
  if (workoutError) return { ok: false, error: workoutError.message };

  if (draft.exercises.length > 0) {
    const { error: exercisesError } = await supabase.from("workout_exercises").upsert(
      draft.exercises.map((exercise) => ({
        id: exercise.id,
        user_id: userId,
        workout_id: draft.workoutId,
        exercise_id: exercise.exerciseId,
        position: exercise.position,
        notes: exercise.notes,
      }))
    );
    if (exercisesError) return { ok: false, error: exercisesError.message };
  }

  const setRows = draft.exercises.flatMap((exercise) =>
    exercise.sets.map((set) => ({
      id: set.id,
      user_id: userId,
      workout_exercise_id: exercise.id,
      position: set.position,
      set_type: set.setType,
      weight_kg: set.weightKg,
      reps: set.reps,
      rpe: set.rpe,
      completed: set.completed,
    }))
  );
  if (setRows.length > 0) {
    const { error: setsError } = await supabase.from("workout_sets").upsert(setRows);
    if (setsError) return { ok: false, error: setsError.message };
  }

  const newRecords = detectNewRecords(
    draft.exercises.flatMap((exercise) =>
      exercise.sets.map((set) => ({ ...set, exerciseId: exercise.exerciseId }))
    ),
    currentBests
  );

  if (newRecords.length > 0) {
    const { error: insertRecordsError } = await supabase.from("personal_records").insert(
      newRecords.map((record) => ({
        id: crypto.randomUUID(),
        user_id: userId,
        exercise_id: record.exerciseId,
        record_type: record.recordType,
        value: record.value,
        workout_set_id: record.workoutSetId,
        achieved_at: finishedAt,
      }))
    );
    if (insertRecordsError) return { ok: false, error: insertRecordsError.message };
  }

  revalidatePath("/gimnasio");
  revalidatePath("/gimnasio/progreso", "layout");

  const nameByExerciseId = new Map(draft.exercises.map((e) => [e.exerciseId, e.exerciseName]));
  return {
    ok: true,
    newRecords: newRecords.map((record) => ({
      exerciseName: nameByExerciseId.get(record.exerciseId) ?? "Ejercicio",
      recordType: record.recordType,
      value: record.value,
    })),
  };
}
