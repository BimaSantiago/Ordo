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

/**
 * Instante UTC (ISO) de una fecha y hora locales de America/Mexico_City.
 * Calcula el desfase real de la zona con Intl en vez de asumir UTC-6 fijo.
 */
export function localDateTimeToUtcIso(localDate: string, time: string): string {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, hours, minutes);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, p.value])
  );
  const zonedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute)
  );
  return new Date(guess - (zonedAsUtc - guess)).toISOString();
}

/** Hora local HH:MM de America/Mexico_City para un instante. */
export function getLocalTimeString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/** "HH:MM[:SS]" a minutos desde medianoche. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Minutos desde medianoche a "HH:MM". */
export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(totalMinutes, 24 * 60 - 1));
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

/** Fecha corta para listas y ejes de gráficas, p. ej. "30 sep". */
export function formatShortDate(localDate: string): string {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(new Date(year, month - 1, day));
}

/** Día de la semana (0=domingo..6=sábado) de una fecha local YYYY-MM-DD, para `schedule_blocks`. */
export function getLocalDayOfWeek(localDate: string): number {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

/** Suma días a una fecha local YYYY-MM-DD (aritmética en UTC para no depender de horario de verano). */
export function addDaysToLocalDate(localDate: string, days: number): string {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Lunes (YYYY-MM-DD) de la semana a la que pertenece una fecha local; las semanas van de lunes a domingo. */
export function getLocalWeekStart(localDate: string): string {
  const dayOfWeek = getLocalDayOfWeek(localDate);
  return addDaysToLocalDate(localDate, -((dayOfWeek + 6) % 7));
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
