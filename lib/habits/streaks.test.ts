import { describe, expect, it } from "vitest";
import { bestStreak, completionRate, currentStreak, dayStatus, isCompleted, isDue, logsByDate, type HabitRule } from "./streaks";

const DAILY: HabitRule = { frequency: "diaria", frequencyDays: null, targetCount: null };
// Lunes, miércoles y viernes.
const MWF: HabitRule = { frequency: "dias_semana", frequencyDays: [1, 3, 5], targetCount: null };
const WATER: HabitRule = { frequency: "diaria", frequencyDays: null, targetCount: 8 };

// Semana de referencia: lunes 2026-09-28 ... domingo 2026-10-04.
const logs = (entries: Record<string, number | null>) =>
  logsByDate(Object.entries(entries).map(([localDate, value]) => ({ localDate, value })));

describe("isDue", () => {
  it("diario toca todos los días; ciertos días solo esos", () => {
    expect(isDue(DAILY, "2026-10-04")).toBe(true);
    expect(isDue(MWF, "2026-09-28")).toBe(true); // lunes
    expect(isDue(MWF, "2026-09-29")).toBe(false); // martes
    expect(isDue(MWF, "2026-10-04")).toBe(false); // domingo
  });
});

describe("fecha de inicio", () => {
  const NEW_HABIT: HabitRule = { ...DAILY, startDate: "2026-10-01" };

  it("antes de crearse no le tocaba: no cuenta como fallado ni rompe nada", () => {
    expect(isDue(NEW_HABIT, "2026-09-30")).toBe(false);
    expect(dayStatus(NEW_HABIT, logs({}), "2026-09-29", "2026-10-01")).toBe("not_due");
    expect(completionRate(NEW_HABIT, logs({}), "2026-09-28", "2026-10-04", "2026-10-02")).toBe(0);
    expect(completionRate(NEW_HABIT, logs({ "2026-10-01": 1 }), "2026-09-28", "2026-10-04", "2026-10-01")).toBe(1);
  });
});

describe("isCompleted", () => {
  it("sí/no: cualquier valor > 0; logs antiguos sin valor cuentan como hecho", () => {
    expect(isCompleted(DAILY, 1)).toBe(true);
    expect(isCompleted(DAILY, logs({ "2026-10-01": null }).get("2026-10-01"))).toBe(true);
    expect(isCompleted(DAILY, undefined)).toBe(false);
  });

  it("meta numérica: solo al llegar a la meta", () => {
    expect(isCompleted(WATER, 7)).toBe(false);
    expect(isCompleted(WATER, 8)).toBe(true);
    expect(isCompleted(WATER, 10)).toBe(true);
  });
});

describe("currentStreak", () => {
  it("cuenta días seguidos hacia atrás desde hoy", () => {
    const l = logs({ "2026-09-29": 1, "2026-09-30": 1, "2026-10-01": 1 });
    expect(currentStreak(DAILY, l, "2026-10-01")).toBe(3);
  });

  it("hoy pendiente no rompe la racha", () => {
    const l = logs({ "2026-09-29": 1, "2026-09-30": 1 });
    expect(currentStreak(DAILY, l, "2026-10-01")).toBe(2);
  });

  it("un día fallado (que no es hoy) la rompe", () => {
    const l = logs({ "2026-09-28": 1, "2026-09-30": 1 });
    expect(currentStreak(DAILY, l, "2026-10-01")).toBe(1);
  });

  it("los días que no tocan no rompen la racha de ciertos días", () => {
    // Lunes, miércoles y viernes cumplidos; el domingo (hoy) no toca.
    const l = logs({ "2026-09-28": 1, "2026-09-30": 1, "2026-10-02": 1 });
    expect(currentStreak(MWF, l, "2026-10-04")).toBe(3);
  });

  it("meta numérica: un día que no llegó a la meta rompe la racha", () => {
    const l = logs({ "2026-09-29": 8, "2026-09-30": 5, "2026-10-01": 9 });
    expect(currentStreak(WATER, l, "2026-10-01")).toBe(1);
  });

  it("sin registros es cero", () => {
    expect(currentStreak(DAILY, new Map(), "2026-10-01")).toBe(0);
  });
});

describe("bestStreak", () => {
  it("encuentra la racha más larga del historial", () => {
    const l = logs({
      "2026-09-20": 1,
      "2026-09-21": 1,
      "2026-09-22": 1,
      "2026-09-23": 1,
      "2026-09-25": 1,
      "2026-10-01": 1,
    });
    expect(bestStreak(DAILY, l, "2026-10-01")).toBe(4);
  });

  it("no cuenta registros futuros", () => {
    expect(bestStreak(DAILY, logs({ "2026-10-05": 1 }), "2026-10-01")).toBe(0);
  });
});

describe("dayStatus y completionRate", () => {
  const l = logs({ "2026-09-28": 1, "2026-10-02": 1 });

  it("clasifica cada día", () => {
    expect(dayStatus(MWF, l, "2026-09-28", "2026-10-02")).toBe("done");
    expect(dayStatus(MWF, l, "2026-09-29", "2026-10-02")).toBe("not_due");
    expect(dayStatus(MWF, l, "2026-09-30", "2026-10-02")).toBe("missed");
    expect(dayStatus(MWF, l, "2026-10-05", "2026-10-02")).toBe("future");
    expect(dayStatus(MWF, logs({}), "2026-10-02", "2026-10-02")).toBe("pending");
  });

  it("porcentaje sobre los días que tocaban, sin futuro ni hoy pendiente", () => {
    // Semana: tocan L, Mi, V. Cumplidos L y V, fallado Mi → 2/3.
    expect(completionRate(MWF, l, "2026-09-28", "2026-10-04", "2026-10-04")).toBeCloseTo(2 / 3);
    // Hoy miércoles pendiente: solo cuenta el lunes → 1/1.
    expect(completionRate(MWF, logs({ "2026-09-28": 1 }), "2026-09-28", "2026-10-04", "2026-09-30")).toBe(1);
    expect(completionRate(MWF, logs({}), "2026-09-29", "2026-09-29", "2026-09-29")).toBeNull();
  });
});
