import { describe, expect, it } from "vitest";
import { formatWeight, fromKg, roundTo, toInputValue, toKg } from "./units";

describe("conversión kg ↔ lb", () => {
  it("kg no cambia", () => {
    expect(fromKg(100, "kg")).toBe(100);
    expect(toKg(100, "kg")).toBe(100);
  });

  it("convierte con el factor exacto", () => {
    expect(roundTo(fromKg(100, "lb"), 2)).toBe(220.46);
    expect(roundTo(toKg(225, "lb"), 2)).toBe(102.06);
  });

  it("ida y vuelta: lo capturado en lb se recupera igual tras guardarse con 2 decimales en kg", () => {
    for (const lb of [45, 95, 100.5, 135, 225, 315]) {
      const storedKg = roundTo(toKg(lb, "lb"), 2); // numeric(6, 2) en la base
      expect(roundTo(fromKg(storedKg, "lb"), 1)).toBe(lb);
    }
  });
});

describe("toInputValue", () => {
  it("vacío sin valor; 2 decimales en la unidad del usuario", () => {
    expect(toInputValue(null, "lb")).toBe("");
    expect(toInputValue(45.359237, "lb")).toBe(100);
    expect(toInputValue(80, "kg")).toBe(80);
  });
});

describe("formatWeight", () => {
  it("formatea en es-MX con la unidad", () => {
    expect(formatWeight(102.5, "kg")).toBe("102.5 kg");
    expect(formatWeight(102.06, "lb", { decimals: 0 })).toBe("225 lb");
    expect(formatWeight(80, "kg", { withUnit: false })).toBe("80");
  });
});
