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
