const TIME_ZONE = "America/Mexico_City";

/** Fecha local (YYYY-MM-DD) en la zona horaria de la app, para hábitos, peso y comida. */
export function getLocalDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDisplayDate(localDate: string): string {
  const [year, month, day] = localDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

/** Día de la semana (0=domingo..6=sábado) de una fecha local YYYY-MM-DD, para `schedule_blocks`. */
export function getLocalDayOfWeek(localDate: string): number {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

export const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;
