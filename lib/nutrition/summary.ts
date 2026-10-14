import { addDaysToLocalDate } from "../date";
import { movingAverage, type DatedValue } from "../body/trend";

/** Totales de un día copiados de Fitia. Cualquier campo puede faltar (null). */
export type NutritionDay = {
  localDate: string;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export type NutritionField = "kcal" | "proteinG" | "carbsG" | "fatG";

/** Metas diarias; null = sin meta. */
export type NutritionGoals = Record<NutritionField, number | null>;

export const EMPTY_GOALS: NutritionGoals = { kcal: null, proteinG: null, carbsG: null, fatG: null };

export const NUTRITION_FIELDS: { field: NutritionField; label: string; short: string; unit: string; max: number }[] = [
  { field: "kcal", label: "Calorías", short: "kcal", unit: "kcal", max: 20000 },
  { field: "proteinG", label: "Proteína", short: "P", unit: "g", max: 2000 },
  { field: "carbsG", label: "Carbohidratos", short: "C", unit: "g", max: 3000 },
  { field: "fatG", label: "Grasa", short: "G", unit: "g", max: 2000 },
];

export type ParsedQuantity = { ok: true; value: number | null } | { ok: false };

/**
 * Interpreta un campo de cantidad: vacío = null; "1,850" (miles) = 1850; "140,5" (coma decimal
 * del teclado) o "140.5" = 140.5. Redondea a un decimal. Negativos o texto no son válidos.
 */
export function parseQuantity(input: string): ParsedQuantity {
  let text = input.replace(/\s/g, "");
  if (!text) return { ok: true, value: null };
  if (text.includes(",") && text.includes(".")) text = text.replace(/,/g, "");
  else if (text.includes(",")) text = /^\d+,\d{1,2}$/.test(text) ? text.replace(",", ".") : text.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false };
  return { ok: true, value: Math.round(Number(text) * 10) / 10 };
}

/** Calorías que suman los macros (4/4/9). null si no hay ningún macro. */
export function macroKcal(day: Pick<NutritionDay, "proteinG" | "carbsG" | "fatG">): number | null {
  if (day.proteinG == null && day.carbsG == null && day.fatG == null) return null;
  return Math.round((day.proteinG ?? 0) * 4 + (day.carbsG ?? 0) * 4 + (day.fatG ?? 0) * 9);
}

/** Porcentaje de la meta (redondeado); null sin valor o sin meta. */
export function goalPercent(value: number | null, goal: number | null): number | null {
  if (value == null || goal == null || goal <= 0) return null;
  return Math.round((value / goal) * 100);
}

export type KcalStatus = "bajo" | "en-meta" | "alto";

/** Calorías contra la meta, con un margen de ±10% para considerarlas "en meta". */
export function kcalStatus(kcal: number | null, goal: number | null): KcalStatus | null {
  // Sin redondear: 1790 de 2000 (89.5%) es "bajo", aunque se muestre como 90%.
  if (kcal == null || goal == null || goal <= 0) return null;
  const ratio = kcal / goal;
  if (ratio < 0.9) return "bajo";
  if (ratio > 1.1) return "alto";
  return "en-meta";
}

export type NutritionAverages = Record<NutritionField, number | null> & { daysLogged: number; totalDays: number };

/**
 * Promedios entre `from` y `to` (incluidos). Cada campo se promedia solo sobre los días que lo
 * tienen: un día sin registrar no cuenta como cero.
 */
export function averagesBetween(days: NutritionDay[], from: string, to: string): NutritionAverages {
  const inRange = days.filter((d) => d.localDate >= from && d.localDate <= to);
  const average = (field: NutritionField, decimals: number) => {
    const values = inRange.map((d) => d[field]).filter((v): v is number => v != null);
    if (values.length === 0) return null;
    const factor = 10 ** decimals;
    return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * factor) / factor;
  };
  let totalDays = 0;
  for (let date = from; date <= to; date = addDaysToLocalDate(date, 1)) totalDays++;
  return {
    daysLogged: inRange.length,
    totalDays,
    kcal: average("kcal", 0),
    proteinG: average("proteinG", 1),
    carbsG: average("carbsG", 1),
    fatG: average("fatG", 1),
  };
}

/** Promedios de los últimos `count` días hasta `today` (incluido). */
export function averagesLastDays(days: NutritionDay[], count: number, today: string): NutritionAverages {
  return averagesBetween(days, addDaysToLocalDate(today, -(count - 1)), today);
}

export type NutritionChartPoint = {
  localDate: string;
  kcal: number | null;
  proteinG: number | null;
  /** Tendencia del peso (media móvil de 7 días) en ese día, si hay registro de peso. */
  weightTrend: number | null;
};

/**
 * Une comida y peso en una sola línea de tiempo para graficarlos juntos: un punto por cada día
 * que tenga comida o peso dentro del rango (`range` en días; null = todo).
 */
export function nutritionWeightSeries(
  days: NutritionDay[],
  weights: DatedValue[],
  range: number | null,
  today: string
): NutritionChartPoint[] {
  const from = range == null ? "" : addDaysToLocalDate(today, -(range - 1));
  // La tendencia se calcula con todo el historial para que el inicio del rango no quede cojo.
  const trend = new Map(movingAverage(weights).map((p) => [p.localDate, p.value]));
  const food = new Map(days.map((d) => [d.localDate, d]));
  const dates = [...new Set([...food.keys(), ...trend.keys()])]
    .filter((date) => date >= from && date <= today)
    .sort();
  return dates.map((localDate) => ({
    localDate,
    kcal: food.get(localDate)?.kcal ?? null,
    proteinG: food.get(localDate)?.proteinG ?? null,
    weightTrend: trend.get(localDate) ?? null,
  }));
}
