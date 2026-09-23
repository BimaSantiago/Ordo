"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocalDateString } from "@/lib/date";

async function requireUserId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No autenticado");
  return { supabase, userId: data.user.id };
}

export async function createTask(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  if (!title) return;

  const { supabase, userId } = await requireUserId();
  await supabase.from("tasks").insert({
    id: randomUUID(),
    user_id: userId,
    title,
    due_date: getLocalDateString(),
  });

  revalidatePath("/hoy");
}

export async function toggleTask(taskId: string, completed: boolean) {
  const { supabase } = await requireUserId();
  await supabase
    .from("tasks")
    .update({
      status: completed ? "completada" : "pendiente",
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", taskId);

  revalidatePath("/hoy");
}

export async function createHabit(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const { supabase, userId } = await requireUserId();
  await supabase.from("habits").insert({
    id: randomUUID(),
    user_id: userId,
    name,
  });

  revalidatePath("/hoy");
}

export async function toggleHabitToday(habitId: string, done: boolean) {
  const { supabase, userId } = await requireUserId();
  const localDate = getLocalDateString();

  if (done) {
    await supabase.from("habit_logs").upsert(
      { id: randomUUID(), user_id: userId, habit_id: habitId, local_date: localDate, done: true },
      { onConflict: "habit_id,local_date" }
    );
  } else {
    await supabase
      .from("habit_logs")
      .delete()
      .eq("habit_id", habitId)
      .eq("local_date", localDate);
  }

  revalidatePath("/hoy");
}

export async function saveWeight(formData: FormData) {
  const weightRaw = formData.get("weight") as string;
  const weight = Number(weightRaw);
  if (!weight || weight <= 0) return;

  const { supabase, userId } = await requireUserId();
  const localDate = getLocalDateString();

  await supabase.from("body_weight_logs").upsert(
    { id: randomUUID(), user_id: userId, local_date: localDate, weight_kg: weight },
    { onConflict: "user_id,local_date" }
  );

  revalidatePath("/hoy");
}

export async function saveQuickNote(formData: FormData) {
  const body = (formData.get("body") as string)?.trim();
  if (!body) return;

  const { supabase, userId } = await requireUserId();
  await supabase.from("notes").insert({
    id: randomUUID(),
    user_id: userId,
    body,
  });

  revalidatePath("/hoy");
}

export async function signOut() {
  const { supabase } = await requireUserId();
  await supabase.auth.signOut();
  redirect("/login");
}
