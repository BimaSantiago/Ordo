"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireUserId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No autenticado");
  return { supabase, userId: data.user.id };
}

function revalidateRoutines() {
  revalidatePath("/gimnasio/rutinas");
}

export async function createRoutine(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const { supabase, userId } = await requireUserId();
  await supabase.from("routines").insert({
    id: randomUUID(),
    user_id: userId,
    name,
  });

  revalidateRoutines();
}

export async function deleteRoutine(routineId: string) {
  const { supabase } = await requireUserId();
  await supabase.from("routines").delete().eq("id", routineId);

  revalidateRoutines();
}

export async function addRoutineExercise(routineId: string, formData: FormData) {
  const exerciseId = formData.get("exercise_id") as string;
  if (!exerciseId) return;
  const targetSets = Number(formData.get("target_sets")) || null;
  const targetRepRange = (formData.get("target_rep_range") as string)?.trim() || null;

  const { supabase, userId } = await requireUserId();

  const { count } = await supabase
    .from("routine_exercises")
    .select("id", { count: "exact", head: true })
    .eq("routine_id", routineId);

  await supabase.from("routine_exercises").insert({
    id: randomUUID(),
    user_id: userId,
    routine_id: routineId,
    exercise_id: exerciseId,
    position: count ?? 0,
    target_sets: targetSets,
    target_rep_range: targetRepRange,
  });

  revalidateRoutines();
}

export async function removeRoutineExercise(routineExerciseId: string) {
  const { supabase } = await requireUserId();
  await supabase.from("routine_exercises").delete().eq("id", routineExerciseId);

  revalidateRoutines();
}

export async function moveRoutineExercise(
  routineId: string,
  routineExerciseId: string,
  direction: "up" | "down"
) {
  const { supabase } = await requireUserId();

  const { data } = await supabase
    .from("routine_exercises")
    .select("id, position")
    .eq("routine_id", routineId)
    .order("position", { ascending: true });

  const items = data ?? [];
  const index = items.findIndex((item) => item.id === routineExerciseId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= items.length) return;

  const current = items[index];
  const swapWith = items[swapIndex];

  await supabase.from("routine_exercises").update({ position: swapWith.position }).eq("id", current.id);
  await supabase.from("routine_exercises").update({ position: current.position }).eq("id", swapWith.id);

  revalidateRoutines();
}
