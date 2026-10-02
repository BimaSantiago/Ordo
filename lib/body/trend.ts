import { addDaysToLocalDate } from "../date";

export type DatedValue = { localDate: string; value: number };

/**
 * Media móvil por calendario: para cada registro, el promedio de los registros de los últimos
 * `windowDays` días (incluido ese día). Usa días de calendario y no "los últimos N registros",
 * para que pesarse a diario o cada tres días dé una tendencia comparable.
 */
export function movingAverage(points: DatedValue[], windowDays = 7): DatedValue[] {
  const sorted = [...points].sort((a, b) => a.localDate.localeCompare(b.localDate));
  return sorted.map((point) => {
    const from = addDaysToLocalDate(point.localDate, -(windowDays - 1));
    const window = sorted.filter((p) => p.localDate >= from && p.localDate <= point.localDate);
    const average = window.reduce((sum, p) => sum + p.value, 0) / window.length;
    return { localDate: point.localDate, value: Math.round(average * 100) / 100 };
  });
}

/** Registros desde `days` días antes de `today` (null = todos). */
export function lastDays(points: DatedValue[], days: number | null, today: string): DatedValue[] {
  if (days == null) return points;
  const from = addDaysToLocalDate(today, -(days - 1));
  return points.filter((p) => p.localDate >= from && p.localDate <= today);
}

/**
 * Cambio de la tendencia (media móvil) entre el registro más reciente y el más cercano a
 * `days` días antes. null si no hay suficientes datos para comparar.
 */
export function trendChange(points: DatedValue[], days: number, windowDays = 7): number | null {
  const trend = movingAverage(points, windowDays);
  if (trend.length < 2) return null;
  const latest = trend[trend.length - 1];
  const target = addDaysToLocalDate(latest.localDate, -days);
  // El registro más reciente que sea igual o anterior a la fecha objetivo.
  const base = [...trend].reverse().find((p) => p.localDate <= target);
  if (!base) return null;
  return Math.round((latest.value - base.value) * 100) / 100;
}
