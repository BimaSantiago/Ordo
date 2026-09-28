"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WorkoutDraft } from "@/lib/gimnasio/workout-draft";

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

  const { data: lastWorkoutExercise } = await supabase
    .from("workout_exercises")
    .select("id, workouts!inner(finished_at)")
    .eq("exercise_id", exerciseId)
    .eq("user_id", userId)
    .not("workouts.finished_at", "is", null)
    .order("finished_at", { foreignTable: "workouts", ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastWorkoutExercise) return [];

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("weight_kg, reps, set_type")
    .eq("workout_exercise_id", lastWorkoutExercise.id)
    .order("position", { ascending: true });

  return (sets ?? []).map((s) => ({ weightKg: s.weight_kg, reps: s.reps, setType: s.set_type }));
}

/** Guarda el entrenamiento completo (workout + ejercicios + series) al finalizarlo. */
export async function finishWorkout(draft: WorkoutDraft) {
  const { supabase, userId } = await requireUserId();
  const finishedAt = new Date().toISOString();

  await supabase.from("workouts").upsert({
    id: draft.id,
    user_id: userId,
    routine_id: draft.routineId,
    name: draft.name,
    started_at: draft.startedAt,
    finished_at: finishedAt,
    notes: draft.notes,
  });

  for (const exercise of draft.exercises) {
    await supabase.from("workout_exercises").upsert({
      id: exercise.id,
      user_id: userId,
      workout_id: draft.id,
      exercise_id: exercise.exerciseId,
      position: exercise.position,
      notes: exercise.notes,
    });

    for (const set of exercise.sets) {
      await supabase.from("workout_sets").upsert({
        id: set.id,
        user_id: userId,
        workout_exercise_id: exercise.id,
        position: set.position,
        set_type: set.setType,
        weight_kg: set.weightKg,
        reps: set.reps,
        rpe: set.rpe,
        completed: set.completed,
      });
    }
  }

  revalidatePath("/gimnasio");
  revalidatePath("/gimnasio/progreso");
}
