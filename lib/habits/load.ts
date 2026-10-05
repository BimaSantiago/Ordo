import type { SupabaseClient } from "@supabase/supabase-js";
import { getLocalDateString } from "../date";
import type { HabitFrequency } from "./streaks";

/** Hábito con su historial, listo para pasar de un Server Component a uno de cliente. */
export type HabitView = {
  id: string;
  name: string;
  frequency: HabitFrequency;
  frequencyDays: number[] | null;
  targetCount: number | null;
  unit: string | null;
  archived: boolean;
  /** Fecha local de creación (los días anteriores no cuentan como fallados). */
  startDate: string;
  /** Fecha local → valor del día (sí/no sin valor = 1). Objeto plano: serializable al cliente. */
  logs: Record<string, number>;
};

/** Hábitos del usuario con sus registros desde `sinceDate` (para rachas y el historial). */
export async function loadHabits(
  supabase: SupabaseClient,
  { sinceDate, includeArchived }: { sinceDate: string; includeArchived: boolean }
): Promise<HabitView[]> {
  let habitsQuery = supabase
    .from("habits")
    .select("id, name, frequency, frequency_days, target_count, unit, archived, created_at")
    .order("created_at", { ascending: true });
  if (!includeArchived) habitsQuery = habitsQuery.eq("archived", false);

  const [{ data: habits }, { data: logs }] = await Promise.all([
    habitsQuery,
    supabase.from("habit_logs").select("habit_id, local_date, value").gte("local_date", sinceDate),
  ]);

  const logsByHabit = new Map<string, Record<string, number>>();
  for (const log of logs ?? []) {
    const entry = logsByHabit.get(log.habit_id) ?? {};
    entry[log.local_date] = log.value ?? 1;
    logsByHabit.set(log.habit_id, entry);
  }

  return (habits ?? []).map((habit) => ({
    id: habit.id,
    name: habit.name,
    frequency: habit.frequency,
    frequencyDays: habit.frequency_days,
    targetCount: habit.target_count,
    unit: habit.unit,
    archived: habit.archived,
    startDate: getLocalDateString(new Date(habit.created_at)),
    logs: logsByHabit.get(habit.id) ?? {},
  }));
}
