"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NUTRITION_COLUMNS, toNutritionDay } from "@/lib/nutrition/load";
import { NUTRITION_FIELDS, type NutritionDay, type NutritionField, type NutritionGoals } from "@/lib/nutrition/summary";
import type { ActionResult } from "@/app/tareas/actions";

// saveNutrition y deleteNutrition son idempotentes (fecha local del cliente y valores absolutos):
// pasan por la cola sin conexión. Las metas se editan con señal.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function requireUserId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No autenticado");
  return { supabase, userId: data.user.id };
}

function revalidateNutrition() {
  revalidatePath("/comida");
  revalidatePath("/hoy");
  revalidatePath("/revision");
}

function invalidField(values: Record<NutritionField, number | null>, { allowZero }: { allowZero: boolean }) {
  return NUTRITION_FIELDS.find(({ field, max }) => {
    const value = values[field];
    return value != null && (!Number.isFinite(value) || value < (allowZero ? 0 : 1) || value > max);
  });
}

/** Totales del día: reemplaza lo que hubiera en esa fecha (un campo vacío queda vacío). */
export async function saveNutrition(input: NutritionDay): Promise<ActionResult> {
  if (!DATE_RE.test(input.localDate)) return { ok: false, error: "Fecha inválida." };
  if (NUTRITION_FIELDS.every(({ field }) => input[field] == null)) return { ok: false, error: "Escribe al menos un total." };
  const invalid = invalidField(input, { allowZero: true });
  if (invalid) return { ok: false, error: `${invalid.label}: valor inválido.` };

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("nutrition_daily").upsert(
    {
      user_id: userId,
      local_date: input.localDate,
      kcal: input.kcal == null ? null : Math.round(input.kcal),
      protein_g: input.proteinG,
      carbs_g: input.carbsG,
      fat_g: input.fatG,
      source: "manual",
    },
    { onConflict: "user_id,local_date" }
  );
  if (error) return { ok: false, error: error.message };
  revalidateNutrition();
  return { ok: true };
}

export async function deleteNutrition(input: { localDate: string }): Promise<ActionResult> {
  if (!DATE_RE.test(input.localDate)) return { ok: false, error: "Fecha inválida." };
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("nutrition_daily").delete().eq("local_date", input.localDate);
  if (error) return { ok: false, error: error.message };
  revalidateNutrition();
  return { ok: true };
}

/** Lo ya guardado en una fecha, para precargar el formulario. */
export async function getNutritionDay(localDate: string): Promise<NutritionDay | null> {
  if (!DATE_RE.test(localDate)) return null;
  const { supabase } = await requireUserId();
  const { data } = await supabase.from("nutrition_daily").select(NUTRITION_COLUMNS).eq("local_date", localDate).maybeSingle();
  return data ? toNutritionDay(data) : null;
}

export async function saveNutritionGoals(goals: NutritionGoals): Promise<ActionResult> {
  const invalid = invalidField(goals, { allowZero: false });
  if (invalid) return { ok: false, error: `Meta de ${invalid.label.toLowerCase()}: valor inválido.` };

  const { supabase, userId } = await requireUserId();
  const round = (value: number | null) => (value == null ? null : Math.round(value));
  const { error } = await supabase.from("user_settings").upsert({
    user_id: userId,
    kcal_goal: round(goals.kcal),
    protein_goal_g: round(goals.proteinG),
    carbs_goal_g: round(goals.carbsG),
    fat_goal_g: round(goals.fatG),
  });
  if (error) return { ok: false, error: error.message };
  revalidateNutrition();
  return { ok: true };
}
