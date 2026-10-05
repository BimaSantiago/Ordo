import { addDaysToLocalDate, getLocalDayOfWeek } from "../date";

export type HabitFrequency = "diaria" | "dias_semana";

export type HabitRule = {
  frequency: HabitFrequency;
  /** 0=domingo..6=sábado; solo con frequency = "dias_semana". */
  frequencyDays: number[] | null;
  /** Meta numérica al día; null = hábito sí/no. */
  targetCount: number | null;
  /** Fecha local en que se creó: antes de esa fecha no le "tocaba", así que no cuenta como fallado. */
  startDate?: string | null;
};

export type HabitLog = { localDate: string; value: number | null };

/** Fechas locales (YYYY-MM-DD) → valor del día. Un log de hábito sí/no sin valor cuenta como 1. */
export type LogsByDate = Map<string, number>;

export function logsByDate(logs: HabitLog[]): LogsByDate {
  return new Map(logs.map((log) => [log.localDate, log.value ?? 1]));
}

/** Si al hábito le toca ese día. */
export function isDue(habit: HabitRule, localDate: string): boolean {
  if (habit.startDate && localDate < habit.startDate) return false;
  if (habit.frequency === "diaria") return true;
  return (habit.frequencyDays ?? []).includes(getLocalDayOfWeek(localDate));
}

export function isCompleted(habit: HabitRule, value: number | undefined): boolean {
  if (value == null) return false;
  return habit.targetCount ? value >= habit.targetCount : value > 0;
}

/** Límite de búsqueda hacia atrás (2 años) para no iterar sin fin. */
const MAX_DAYS = 730;

/**
 * Días seguidos cumplidos, contando hacia atrás desde hoy. Los días que no le tocan al hábito
 * no rompen la racha, y hoy todavía pendiente tampoco (el día no ha terminado).
 */
export function currentStreak(habit: HabitRule, logs: LogsByDate, today: string): number {
  let streak = 0;
  for (let i = 0; i < MAX_DAYS; i++) {
    const date = addDaysToLocalDate(today, -i);
    if (!isDue(habit, date)) continue;
    if (isCompleted(habit, logs.get(date))) streak += 1;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}

/** La racha más larga desde el primer registro hasta hoy. */
export function bestStreak(habit: HabitRule, logs: LogsByDate, today: string): number {
  const dates = [...logs.keys()].filter((date) => date <= today).sort();
  if (dates.length === 0) return 0;

  let best = 0;
  let run = 0;
  for (let date = dates[0]; date <= today; date = addDaysToLocalDate(date, 1)) {
    if (!isDue(habit, date)) continue;
    if (isCompleted(habit, logs.get(date))) {
      run += 1;
      best = Math.max(best, run);
    } else if (date !== today) {
      run = 0;
    }
  }
  return best;
}

export type DayStatus = "done" | "missed" | "pending" | "not_due" | "future";

/** Estado de un día para el historial: cumplido, fallado, hoy pendiente, no tocaba o futuro. */
export function dayStatus(habit: HabitRule, logs: LogsByDate, date: string, today: string): DayStatus {
  if (date > today) return "future";
  if (!isDue(habit, date)) return isCompleted(habit, logs.get(date)) ? "done" : "not_due";
  if (isCompleted(habit, logs.get(date))) return "done";
  return date === today ? "pending" : "missed";
}

/** Porcentaje (0–1) de días cumplidos entre los que tocaban en el rango, sin contar el futuro ni hoy pendiente. */
export function completionRate(habit: HabitRule, logs: LogsByDate, from: string, to: string, today: string): number | null {
  let due = 0;
  let done = 0;
  for (let date = from; date <= to && date <= today; date = addDaysToLocalDate(date, 1)) {
    const status = dayStatus(habit, logs, date, today);
    if (status === "done" && isDue(habit, date)) {
      due += 1;
      done += 1;
    } else if (status === "missed") {
      due += 1;
    }
  }
  return due === 0 ? null : done / due;
}
