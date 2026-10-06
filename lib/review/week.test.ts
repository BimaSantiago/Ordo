import { describe, expect, it } from "vitest";
import { habitStats, resolveWeekStart, reviewWeekFor, taskStats, weekRange, weeklyWeightChange } from "./week";

// 2026-10-05 es lunes; 2026-10-11, domingo.
const MONDAY = "2026-10-05";

describe("weekRange", () => {
  it("va de lunes a domingo", () => {
    expect(weekRange(MONDAY)).toEqual({ from: MONDAY, to: "2026-10-11" });
  });
});

describe("resolveWeekStart", () => {
  it("usa la semana actual sin parámetro o con uno inválido", () => {
    expect(resolveWeekStart(undefined, "2026-10-08")).toBe(MONDAY);
    expect(resolveWeekStart("ayer", "2026-10-08")).toBe(MONDAY);
    expect(resolveWeekStart("2026-13-40", "2026-10-08")).toBe(MONDAY);
  });

  it("lleva cualquier día a su lunes", () => {
    expect(resolveWeekStart("2026-10-01", "2026-10-08")).toBe("2026-09-28");
  });

  it("no deja ir a semanas futuras", () => {
    expect(resolveWeekStart("2026-11-02", "2026-10-08")).toBe(MONDAY);
  });
});

describe("reviewWeekFor", () => {
  it("el domingo revisa la semana en curso", () => {
    expect(reviewWeekFor("2026-10-11")).toBe(MONDAY);
  });

  it("de lunes a sábado revisa la semana anterior", () => {
    expect(reviewWeekFor("2026-10-12")).toBe(MONDAY);
    expect(reviewWeekFor("2026-10-10")).toBe("2026-09-28");
  });
});

describe("taskStats", () => {
  it("cuenta completadas en la semana, vencidas al cierre y las de la semana siguiente", () => {
    const stats = taskStats(
      [
        { completed: true, dueDate: "2026-10-06", completedDate: "2026-10-07" },
        { completed: true, dueDate: null, completedDate: "2026-10-11" },
        { completed: true, dueDate: null, completedDate: "2026-10-04" }, // semana anterior
        { completed: false, dueDate: "2026-10-01", completedDate: null }, // vencida de antes
        { completed: false, dueDate: "2026-10-11", completedDate: null }, // vence el domingo
        { completed: false, dueDate: "2026-10-12", completedDate: null }, // semana siguiente
        { completed: false, dueDate: "2026-10-18", completedDate: null }, // último día de la siguiente
        { completed: false, dueDate: "2026-10-19", completedDate: null }, // más adelante
        { completed: false, dueDate: null, completedDate: null },
      ],
      MONDAY
    );
    expect(stats).toEqual({ completed: 2, overdue: 2, nextWeek: 2 });
  });
});

describe("habitStats", () => {
  const daily = { id: "a", name: "Leer", frequency: "diaria" as const, frequencyDays: null, targetCount: null, startDate: "2026-01-01" };

  it("calcula el porcentaje por hábito y el promedio, sin contar días futuros", () => {
    const { rows, average } = habitStats(
      [
        { ...daily, logs: { "2026-10-05": 1, "2026-10-06": 1 } },
        { ...daily, id: "b", name: "Agua", targetCount: 8, logs: { "2026-10-05": 8, "2026-10-06": 3, "2026-10-07": 8 } },
      ],
      MONDAY,
      "2026-10-08" // jueves pendiente: no cuenta
    );
    expect(rows.map((r) => [r.id, r.rate])).toEqual([
      ["a", 2 / 3],
      ["b", 2 / 3],
    ]);
    expect(average).toBeCloseTo(2 / 3);
  });

  it("omite hábitos que no tocaban en la semana", () => {
    const { rows, average } = habitStats(
      [{ ...daily, frequency: "dias_semana", frequencyDays: [6], logs: {} }],
      MONDAY,
      "2026-10-08"
    );
    expect(rows).toEqual([]);
    expect(average).toBeNull();
  });
});

describe("weeklyWeightChange", () => {
  it("compara la tendencia al final de la semana con la anterior", () => {
    const result = weeklyWeightChange(
      [
        { localDate: "2026-10-01", value: 80 },
        { localDate: "2026-10-09", value: 79 },
      ],
      MONDAY
    );
    expect(result).toEqual({ latest: 79, change: -1 });
  });

  it("ignora registros posteriores a la semana", () => {
    const result = weeklyWeightChange(
      [
        { localDate: "2026-10-06", value: 80 },
        { localDate: "2026-10-20", value: 70 },
      ],
      MONDAY
    );
    expect(result).toEqual({ latest: 80, change: null });
  });

  it("es null sin registros en la semana", () => {
    expect(weeklyWeightChange([{ localDate: "2026-10-01", value: 80 }], MONDAY)).toBeNull();
  });
});
