import { addDaysToLocalDate, localDateTimeToUtcIso, minutesToTime, timeToMinutes } from "./date";

export type ReminderOption = "none" | "at_time" | "10m" | "1h" | "day_8am" | "day_before_8pm";

export const REMINDER_LABELS: Record<ReminderOption, string> = {
  none: "Sin aviso",
  at_time: "A la hora",
  "10m": "10 min antes",
  "1h": "1 h antes",
  day_8am: "Ese día 8:00",
  day_before_8pm: "Un día antes 20:00",
};

/** Opciones que tienen sentido: las relativas a la hora solo si la tarea tiene hora. */
export function reminderOptionsFor(hasTime: boolean): ReminderOption[] {
  return hasTime
    ? ["none", "at_time", "10m", "1h", "day_before_8pm"]
    : ["none", "day_8am", "day_before_8pm"];
}

/** Instante UTC (ISO) del aviso en America/Mexico_City, o null si no aplica. */
export function computeRemindAt(option: ReminderOption, dueDate: string, startTime: string | null): string | null {
  switch (option) {
    case "none":
      return null;
    case "day_8am":
      return localDateTimeToUtcIso(dueDate, "08:00");
    case "day_before_8pm":
      return localDateTimeToUtcIso(addDaysToLocalDate(dueDate, -1), "20:00");
    case "at_time":
    case "10m":
    case "1h": {
      if (!startTime) return null;
      const offset = option === "at_time" ? 0 : option === "10m" ? 10 : 60;
      const minutes = timeToMinutes(startTime) - offset;
      // Si el aviso cae antes de medianoche, pasa al día anterior.
      const date = minutes < 0 ? addDaysToLocalDate(dueDate, -1) : dueDate;
      return localDateTimeToUtcIso(date, minutesToTime((minutes + 24 * 60) % (24 * 60)));
    }
  }
}
