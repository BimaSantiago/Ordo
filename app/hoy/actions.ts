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

export type HabitInput = {
  id: string;
  name: string;
  frequency: "diaria" | "dias_semana";
  /** 0=domingo..6=sábado; solo con "dias_semana". */
  frequencyDays: number[] | null;
  /** Meta numérica al día; null = hábito sí/no. */
  targetCount: number | null;
  /** Unidad de la meta, p. ej. "vasos". */
  unit: string | null;
};

function revalidateHabits() {
  revalidatePath("/hoy");
  revalidatePath("/habitos");
}

/** Crea o edita un hábito (mismo id). */
export async function saveHabit(input: HabitInput): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Escribe el nombre del hábito." };
  const days = [...new Set(input.frequencyDays ?? [])].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
  if (input.frequency === "dias_semana" && days.length === 0) return { ok: false, error: "Elige al menos un día." };
  if (input.targetCount != null && (!Number.isInteger(input.targetCount) || input.targetCount < 1)) {
    return { ok: false, error: "La meta debe ser un número entero mayor que cero." };
  }

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("habits").upsert({
    id: input.id,
    user_id: userId,
    name,
    frequency: input.frequency,
    frequency_days: input.frequency === "dias_semana" ? days : null,
    target_count: input.targetCount,
    unit: input.targetCount ? input.unit?.trim() || null : null,
  });
  if (error) return { ok: false, error: error.message };

  revalidateHabits();
  return { ok: true };
}

/** Compatibilidad con pendientes viejos de la cola sin conexión (antes solo se creaban sí/no diarios). */
export async function createHabit(input: { id: string; name: string }): Promise<ActionResult> {
  return saveHabit({ ...input, frequency: "diaria", frequencyDays: null, targetCount: null, unit: null });
}

export async function setHabitArchived(input: { habitId: string; archived: boolean }): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("habits").update({ archived: input.archived }).eq("id", input.habitId);
  if (error) return { ok: false, error: error.message };
  revalidateHabits();
  return { ok: true };
}

export async function deleteHabit(input: { habitId: string }): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("habits").delete().eq("id", input.habitId);
  if (error) return { ok: false, error: error.message };
  revalidateHabits();
  return { ok: true };
}

/**
 * Valor de un hábito en una fecha local concreta (la del momento en que se tocó). Es un valor
 * absoluto, no un "+1", para que reintentarlo desde la cola sin conexión no sume dos veces.
 * Sí/no: 1 = hecho, 0 = no. Numérico: la cuenta del día. 0 borra el registro.
 */
export async function setHabitLog(input: { habitId: string; localDate: string; value: number }): Promise<ActionResult> {
  if (!DATE_RE.test(input.localDate)) return { ok: false, error: "Fecha inválida." };
  if (!Number.isInteger(input.value) || input.value < 0 || input.value > 10_000) {
    return { ok: false, error: "Valor inválido." };
  }
  const { supabase, userId } = await requireUserId();

  const { error } =
    input.value > 0
      ? await supabase.from("habit_logs").upsert(
          { user_id: userId, habit_id: input.habitId, local_date: input.localDate, done: true, value: input.value },
          { onConflict: "habit_id,local_date" }
        )
      : await supabase.from("habit_logs").delete().eq("habit_id", input.habitId).eq("local_date", input.localDate);
  if (error) return { ok: false, error: error.message };

  revalidateHabits();
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
  revalidatePath("/peso");
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
