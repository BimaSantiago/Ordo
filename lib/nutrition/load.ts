import type { SupabaseClient } from "@supabase/supabase-js";
import { EMPTY_GOALS, type NutritionDay, type NutritionGoals } from "./summary";

export const NUTRITION_COLUMNS = "local_date, kcal, protein_g, carbs_g, fat_g";

type NutritionRow = {
  local_date: string;
  kcal: number | null;
  protein_g: number | string | null;
  carbs_g: number | string | null;
  fat_g: number | string | null;
};

// numeric de Postgres puede llegar como string.
const num = (value: number | string | null) => (value == null ? null : Number(value));

export function toNutritionDay(row: NutritionRow): NutritionDay {
  return {
    localDate: row.local_date,
    kcal: row.kcal,
    proteinG: num(row.protein_g),
    carbsG: num(row.carbs_g),
    fatG: num(row.fat_g),
  };
}

/** Días registrados desde `sinceDate` (o todos), del más viejo al más nuevo. Pagina de 1000 en 1000. */
export async function loadNutritionDays(supabase: SupabaseClient, { sinceDate }: { sinceDate?: string } = {}) {
  const days: NutritionDay[] = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase.from("nutrition_daily").select(NUTRITION_COLUMNS).order("local_date", { ascending: true });
    if (sinceDate) query = query.gte("local_date", sinceDate);
    const { data, error } = await query.range(from, from + 999);
    if (error) throw new Error(error.message);
    days.push(...(data as NutritionRow[]).map(toNutritionDay));
    if (data.length < 1000) return days;
  }
}

export async function loadNutritionGoals(supabase: SupabaseClient): Promise<NutritionGoals> {
  const { data } = await supabase
    .from("user_settings")
    .select("kcal_goal, protein_goal_g, carbs_goal_g, fat_goal_g")
    .maybeSingle();
  if (!data) return EMPTY_GOALS;
  return { kcal: data.kcal_goal, proteinG: data.protein_goal_g, carbsG: data.carbs_goal_g, fatG: data.fat_goal_g };
}
