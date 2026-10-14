import { describe, expect, it } from "vitest";
import {
  averagesBetween,
  averagesLastDays,
  goalPercent,
  kcalStatus,
  macroKcal,
  nutritionWeightSeries,
  parseQuantity,
  type NutritionDay,
} from "./summary";

const day = (localDate: string, kcal: number | null, proteinG: number | null = null): NutritionDay => ({
  localDate,
  kcal,
  proteinG,
  carbsG: null,
  fatG: null,
});

describe("parseQuantity", () => {
  it("vacío es null y válido", () => {
    expect(parseQuantity("")).toEqual({ ok: true, value: null });
    expect(parseQuantity("  ")).toEqual({ ok: true, value: null });
  });

  it("entiende miles con coma y decimales con coma o punto", () => {
    expect(parseQuantity("1,850")).toEqual({ ok: true, value: 1850 });
    expect(parseQuantity("1,850.5")).toEqual({ ok: true, value: 1850.5 });
    expect(parseQuantity("140,5")).toEqual({ ok: true, value: 140.5 });
    expect(parseQuantity("140.5")).toEqual({ ok: true, value: 140.5 });
    expect(parseQuantity("0")).toEqual({ ok: true, value: 0 });
  });

  it("redondea a un decimal", () => {
    expect(parseQuantity("62.25")).toEqual({ ok: true, value: 62.3 });
  });

  it("rechaza negativos y texto", () => {
    expect(parseQuantity("-5")).toEqual({ ok: false });
    expect(parseQuantity("abc")).toEqual({ ok: false });
    expect(parseQuantity("12.")).toEqual({ ok: false });
  });
});

describe("macroKcal", () => {
  it("suma 4/4/9 y trata un macro faltante como cero", () => {
    expect(macroKcal({ proteinG: 150, carbsG: 200, fatG: 60 })).toBe(1940);
    expect(macroKcal({ proteinG: 100, carbsG: null, fatG: null })).toBe(400);
  });

  it("null si no hay macros", () => {
    expect(macroKcal({ proteinG: null, carbsG: null, fatG: null })).toBeNull();
  });
});

describe("goalPercent y kcalStatus", () => {
  it("calcula el porcentaje solo con valor y meta", () => {
    expect(goalPercent(1500, 2000)).toBe(75);
    expect(goalPercent(null, 2000)).toBeNull();
    expect(goalPercent(1500, null)).toBeNull();
  });

  it("da ±10% de margen para estar en meta", () => {
    expect(kcalStatus(1790, 2000)).toBe("bajo");
    expect(kcalStatus(1800, 2000)).toBe("en-meta");
    expect(kcalStatus(2200, 2000)).toBe("en-meta");
    expect(kcalStatus(2210, 2000)).toBe("alto");
    expect(kcalStatus(2000, null)).toBeNull();
  });
});

describe("averagesBetween", () => {
  const days = [
    day("2026-10-01", 2000, 150),
    day("2026-10-02", 1800, null),
    day("2026-10-04", null, 120),
    day("2026-10-09", 3000, 100),
  ];

  it("promedia cada campo solo sobre los días que lo tienen", () => {
    const result = averagesBetween(days, "2026-10-01", "2026-10-07");
    expect(result.kcal).toBe(1900);
    expect(result.proteinG).toBe(135);
    expect(result.carbsG).toBeNull();
    expect(result.daysLogged).toBe(3);
    expect(result.totalDays).toBe(7);
  });

  it("sin registros da null y cero días", () => {
    const result = averagesBetween(days, "2026-09-01", "2026-09-07");
    expect(result.kcal).toBeNull();
    expect(result.daysLogged).toBe(0);
  });

  it("averagesLastDays incluye hoy", () => {
    expect(averagesLastDays(days, 7, "2026-10-09").kcal).toBe(3000);
    expect(averagesLastDays(days, 7, "2026-10-09").daysLogged).toBe(2);
  });
});

describe("nutritionWeightSeries", () => {
  const days = [day("2026-10-01", 2000), day("2026-10-03", 2500, 140)];
  const weights = [
    { localDate: "2026-09-20", value: 80 },
    { localDate: "2026-10-02", value: 79 },
    { localDate: "2026-10-03", value: 78 },
  ];

  it("une ambas fuentes por fecha, en orden", () => {
    const series = nutritionWeightSeries(days, weights, null, "2026-10-03");
    expect(series.map((p) => p.localDate)).toEqual(["2026-09-20", "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(series[1]).toEqual({ localDate: "2026-10-01", kcal: 2000, proteinG: null, weightTrend: null });
    expect(series[3]).toEqual({ localDate: "2026-10-03", kcal: 2500, proteinG: 140, weightTrend: 78.5 });
  });

  it("recorta al rango pero calcula la tendencia con todo el historial", () => {
    const series = nutritionWeightSeries(days, [{ localDate: "2026-09-27", value: 82 }, ...weights.slice(1)], 3, "2026-10-03");
    expect(series.map((p) => p.localDate)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    // 2026-10-02: promedio de 82 (27 sep) y 79.
    expect(series[1].weightTrend).toBe(80.5);
  });
});
