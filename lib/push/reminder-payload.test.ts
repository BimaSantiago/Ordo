import { describe, expect, it } from "vitest";
import { buildReminderPayload, dueReminderWindow, type ReminderTask } from "./reminder-payload";

// 2026-10-01 16:00 en Ciudad de México (UTC-6).
const NOW = new Date("2026-10-01T22:00:00.000Z");

const base: ReminderTask = {
  id: "abc",
  title: "Examen de Cálculo",
  dueDate: "2026-10-01",
  startTime: null,
  endTime: null,
  categoryName: null,
};

describe("dueReminderWindow", () => {
  it("toma la última hora hasta este instante", () => {
    expect(dueReminderWindow(NOW)).toEqual({
      from: "2026-10-01T21:00:00.000Z",
      to: "2026-10-01T22:00:00.000Z",
    });
  });
});

describe("buildReminderPayload", () => {
  it("actividad de hoy con hora y materia", () => {
    const payload = buildReminderPayload(
      { ...base, startTime: "16:00:00", endTime: "17:30:00", categoryName: "Cálculo" },
      NOW
    );
    expect(payload).toEqual({
      title: "Examen de Cálculo",
      body: "Hoy · 16:00–17:30 · Cálculo",
      url: "/hoy",
      tag: "task-abc",
    });
  });

  it("tarea sin hora para mañana abre la semana de esa fecha", () => {
    const payload = buildReminderPayload({ ...base, dueDate: "2026-10-02" }, NOW);
    expect(payload.body).toBe("Para mañana");
    expect(payload.url).toBe("/horario?semana=2026-09-28");
  });

  it("usa la fecha local, no la UTC: a las 20:00 del día 1 ya es día 2 en UTC", () => {
    const evening = new Date("2026-10-02T02:00:00.000Z");
    expect(buildReminderPayload(base, evening).body).toBe("Para hoy");
  });

  it("otras fechas muestran el día corto", () => {
    const payload = buildReminderPayload({ ...base, dueDate: "2026-10-05", startTime: "09:00" }, NOW);
    expect(payload.body).toBe("5 oct · 09:00");
    expect(buildReminderPayload({ ...base, dueDate: "2026-10-05" }, NOW).body).toBe("Para el 5 oct");
  });
});
