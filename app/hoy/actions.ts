"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocalDateString } from "@/lib/date";
import type { ActionResult } from "@/app/tareas/actions";

async function requireUserId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No autenticado");
  return { supabase, userId: data.user.id };
}

export async function createHabit(name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Escribe el nombre del hábito." };

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("habits").insert({ id: randomUUID(), user_id: userId, name: trimmed });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/hoy");
  return { ok: true };
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
    await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("local_date", localDate);
  }

  revalidatePath("/hoy");
}

export async function saveWeight(weightKg: number): Promise<ActionResult> {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500) {
    return { ok: false, error: "Peso inválido." };
  }

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("body_weight_logs").upsert(
    { id: randomUUID(), user_id: userId, local_date: getLocalDateString(), weight_kg: weightKg },
    { onConflict: "user_id,local_date" }
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/hoy");
  revalidatePath("/gimnasio/progreso", "layout");
  return { ok: true };
}

export async function saveQuickNote(body: string): Promise<ActionResult> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "La nota está vacía." };

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("notes").insert({ id: randomUUID(), user_id: userId, body: trimmed });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/hoy");
  return { ok: true };
}
