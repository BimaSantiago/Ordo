"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/tareas/actions";

// Todas estas acciones reciben el id y la fecha local desde el cliente: se pueden reintentar
// desde la cola sin conexión (lib/offline) sin duplicar ni caer en otra fecha.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function requireUserId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No autenticado");
  return { supabase, userId: data.user.id };
}

export async function createHabit(input: { id: string; name: string }): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Escribe el nombre del hábito." };

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("habits").upsert({ id: input.id, user_id: userId, name });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/hoy");
  return { ok: true };
}

/** Marca o desmarca un hábito en una fecha local concreta (la del momento en que se tocó). */
export async function setHabitLog(input: { habitId: string; localDate: string; done: boolean }): Promise<ActionResult> {
  if (!DATE_RE.test(input.localDate)) return { ok: false, error: "Fecha inválida." };
  const { supabase, userId } = await requireUserId();

  const { error } = input.done
    ? await supabase.from("habit_logs").upsert(
        { user_id: userId, habit_id: input.habitId, local_date: input.localDate, done: true },
        { onConflict: "habit_id,local_date" }
      )
    : await supabase.from("habit_logs").delete().eq("habit_id", input.habitId).eq("local_date", input.localDate);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/hoy");
  return { ok: true };
}

export async function saveWeight(input: { localDate: string; weightKg: number }): Promise<ActionResult> {
  if (!DATE_RE.test(input.localDate)) return { ok: false, error: "Fecha inválida." };
  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0 || input.weightKg > 500) {
    return { ok: false, error: "Peso inválido." };
  }

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("body_weight_logs")
    .upsert(
      { user_id: userId, local_date: input.localDate, weight_kg: input.weightKg },
      { onConflict: "user_id,local_date" }
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/hoy");
  revalidatePath("/gimnasio/progreso", "layout");
  return { ok: true };
}

export async function saveQuickNote(input: { id: string; body: string }): Promise<ActionResult> {
  const body = input.body.trim();
  if (!body) return { ok: false, error: "La nota está vacía." };

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("notes").upsert({ id: input.id, user_id: userId, body });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/hoy");
  return { ok: true };
}
