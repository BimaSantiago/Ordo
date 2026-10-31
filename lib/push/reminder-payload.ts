import { addDaysToLocalDate, formatShortDate, getLocalDateString, getLocalWeekStart } from "../date";

/** Avisos más viejos que esto ya no se mandan (tareas antiguas, cron caído por horas). */
export const REMINDER_GRACE_MINUTES = 60;

export type ReminderTask = {
  id: string;
  title: string;
  dueDate: string;
  startTime: string | null;
  endTime: string | null;
  categoryName: string | null;
};

/** Lo que recibe el service worker en el evento `push` (ver public/sw.js). */
export type PushPayload = {
  title: string;
  body: string;
  /** Pantalla que se abre al tocar la notificación. */
  url: string;
  /** Una notificación por tarea: un aviso nuevo de la misma tarea reemplaza al anterior. */
  tag: string;
};

/** Rango de `remind_at` (ISO) que toca mandar en este minuto. */
export function dueReminderWindow(now: Date): { from: string; to: string } {
  return {
    from: new Date(now.getTime() - REMINDER_GRACE_MINUTES * 60_000).toISOString(),
    to: now.toISOString(),
  };
}

function dayLabel(dueDate: string, today: string): string {
  if (dueDate === today) return "Hoy";
  if (dueDate === addDaysToLocalDate(today, 1)) return "Mañana";
  return formatShortDate(dueDate);
}

const shortTime = (time: string) => time.slice(0, 5);

export function buildReminderPayload(task: ReminderTask, now: Date): PushPayload {
  const today = getLocalDateString(now);
  const day = dayLabel(task.dueDate, today);
  const when = task.startTime
    ? `${day} · ${shortTime(task.startTime)}${task.endTime ? `–${shortTime(task.endTime)}` : ""}`
    : day === "Hoy" || day === "Mañana"
      ? `Para ${day.toLowerCase()}`
      : `Para el ${day}`;

  return {
    title: task.title,
    body: task.categoryName ? `${when} · ${task.categoryName}` : when,
    url: task.dueDate === today ? "/hoy" : `/horario?semana=${getLocalWeekStart(task.dueDate)}`,
    tag: `task-${task.id}`,
  };
}
