import { addDaysToLocalDate, getLocalWeekStart } from "../date";
import { movingAverage, type DatedValue } from "../body/trend";
import { completionRate, logsByDate, type HabitRule } from "../habits/streaks";

/** Lunes y domingo (YYYY-MM-DD) de la semana que empieza en `weekStart`. */
export function weekRange(weekStart: string): { from: string; to: string } {
  return { from: weekStart, to: addDaysToLocalDate(weekStart, 6) };
}

/** Semana a mostrar a partir de `?semana=`: cualquier fecha válida se lleva a su lunes; nunca después de la actual. */
export function resolveWeekStart(param: string | undefined | null, today: string): string {
  const current = getLocalWeekStart(today);
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param) || Number.isNaN(Date.parse(`${param}T00:00:00Z`))) return current;
  const week = getLocalWeekStart(param);
  return week > current ? current : week;
}

/**
 * Semana que toca revisar: el domingo es la semana en curso; de lunes a sábado, la anterior
 * (así el lunes todavía se puede hacer la revisión que quedó pendiente).
 */
export function reviewWeekFor(today: string): string {
  const weekStart = getLocalWeekStart(today);
  return today === addDaysToLocalDate(weekStart, 6) ? weekStart : addDaysToLocalDate(weekStart, -7);
}

export type ReviewTask = {
  completed: boolean;
  dueDate: string | null;
  /** Fecha local en que se completó (de `completed_at`). */
  completedDate: string | null;
};

/** Tareas completadas en la semana, vencidas al cierre de la semana y con fecha en la siguiente. */
export function taskStats(tasks: ReviewTask[], weekStart: string) {
  const { from, to } = weekRange(weekStart);
  const nextTo = addDaysToLocalDate(to, 7);
  let completed = 0;
  let overdue = 0;
  let nextWeek = 0;
  for (const task of tasks) {
    if (task.completed) {
      if (task.completedDate && task.completedDate >= from && task.completedDate <= to) completed += 1;
      continue;
    }
    if (!task.dueDate) continue;
    if (task.dueDate <= to) overdue += 1;
    else if (task.dueDate <= nextTo) nextWeek += 1;
  }
  return { completed, overdue, nextWeek };
}

export type ReviewHabit = HabitRule & { id: string; name: string; logs: Record<string, number> };

/** Cumplimiento (0–1) de cada hábito en la semana y el promedio; null si no tocaba ningún día. */
export function habitStats(habits: ReviewHabit[], weekStart: string, today: string) {
  const { from, to } = weekRange(weekStart);
  const rows = habits
    .map((habit) => ({
      id: habit.id,
      name: habit.name,
      rate: completionRate(habit, logsByDate(Object.entries(habit.logs).map(([localDate, value]) => ({ localDate, value }))), from, to, today),
    }))
    .filter((row): row is { id: string; name: string; rate: number } => row.rate !== null);
  const average = rows.length === 0 ? null : rows.reduce((sum, row) => sum + row.rate, 0) / rows.length;
  return { rows, average };
}

/**
 * Cambio de la tendencia de peso (media móvil de 7 días) en la semana: último punto de la
 * semana contra el último punto anterior a ella. null si falta alguno de los dos.
 */
export function weeklyWeightChange(points: DatedValue[], weekStart: string): { latest: number; change: number | null } | null {
  const { to } = weekRange(weekStart);
  const trend = movingAverage(points.filter((p) => p.localDate <= to));
  const inWeek = trend.filter((p) => p.localDate >= weekStart);
  if (inWeek.length === 0) return null;
  const latest = inWeek[inWeek.length - 1].value;
  const before = trend.filter((p) => p.localDate < weekStart).at(-1);
  return { latest, change: before ? Math.round((latest - before.value) * 100) / 100 : null };
}
