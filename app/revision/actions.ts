"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocalDayOfWeek } from "@/lib/date";
import type { ActionResult } from "@/app/tareas/actions";

/**
 * Guarda la reflexión de una semana (una fila por lunes). Pasa por la cola sin conexión:
 * upsert por (user_id, week_start) con los tres textos completos, así reintentar no duplica.
 */
export async function saveWeeklyReview(input: {
  id: string;
  weekStart: string;
  wins: string;
  lessons: string;
  nextFocus: string;
}): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.weekStart) || getLocalDayOfWeek(input.weekStart) !== 1) {
    return { ok: false, error: "Semana inválida." };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No autenticado");

  const { error } = await supabase.from("weekly_reviews").upsert(
    {
      id: input.id,
      user_id: data.user.id,
      week_start: input.weekStart,
      wins: input.wins.trim() || null,
      lessons: input.lessons.trim() || null,
      next_focus: input.nextFocus.trim() || null,
    },
    { onConflict: "user_id,week_start", ignoreDuplicates: false }
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/revision");
  revalidatePath("/hoy");
  return { ok: true };
}
