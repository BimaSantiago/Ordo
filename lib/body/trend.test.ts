import { describe, expect, it } from "vitest";
import { lastDays, movingAverage, trendChange } from "./trend";

const p = (localDate: string, value: number) => ({ localDate, value });

describe("movingAverage", () => {
  it("promedia los registros de los últimos 7 días de calendario", () => {
    const result = movingAverage([p("2026-09-01", 80), p("2026-09-04", 79), p("2026-09-07", 78), p("2026-09-08", 77)]);
    expect(result.map((r) => r.value)).toEqual([80, 79.5, 79, 78]);
    // 2026-09-08 ya no incluye el 1 (fuera de la ventana de 7 días: 2 al 8).
  });

  it("ordena por fecha aunque lleguen desordenados", () => {
    const result = movingAverage([p("2026-09-03", 70), p("2026-09-01", 72)]);
    expect(result).toEqual([p("2026-09-01", 72), p("2026-09-03", 71)]);
  });

  it("redondea a 2 decimales y no truena vacío", () => {
    expect(movingAverage([p("2026-09-01", 70), p("2026-09-02", 70.1), p("2026-09-03", 70.15)])[2].value).toBe(70.08);
    expect(movingAverage([])).toEqual([]);
  });
});

describe("lastDays", () => {
  const points = [p("2026-08-01", 1), p("2026-09-02", 2), p("2026-10-01", 3)];

  it("filtra los últimos N días incluyendo hoy", () => {
    expect(lastDays(points, 30, "2026-10-01").map((x) => x.value)).toEqual([2, 3]);
    expect(lastDays(points, null, "2026-10-01")).toHaveLength(3);
  });
});

describe("trendChange", () => {
  it("compara la tendencia actual contra la de hace N días", () => {
    const points = [p("2026-09-01", 80), p("2026-09-15", 79), p("2026-10-01", 77)];
    // Tendencias: 80, 79, 77 (cada registro aislado en su ventana). Hace 30 días del 1-oct → 1-sep.
    expect(trendChange(points, 30)).toBe(-3);
  });

  it("null si no hay un registro anterior a la fecha de comparación", () => {
    expect(trendChange([p("2026-09-20", 80), p("2026-10-01", 79)], 30)).toBeNull();
    expect(trendChange([p("2026-10-01", 79)], 30)).toBeNull();
  });
});
