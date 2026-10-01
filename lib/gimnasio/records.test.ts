import { describe, expect, it } from "vitest";
import { detectNewRecords, estimateOneRepMax, recordKey, setRecordValues, type RecordSet } from "./records";

function set(overrides: Partial<RecordSet> = {}): RecordSet {
  return {
    id: "set-1",
    exerciseId: "bench",
    setType: "normal",
    weightKg: 100,
    reps: 5,
    completed: true,
    ...overrides,
  };
}

describe("estimateOneRepMax", () => {
  it("aplica Epley: peso × (1 + reps / 30)", () => {
    expect(estimateOneRepMax(100, 5)).toBe(116.67);
    expect(estimateOneRepMax(60, 10)).toBe(80);
  });

  it("con una repetición el 1RM es el peso levantado", () => {
    expect(estimateOneRepMax(140, 1)).toBe(140);
  });

  it("regresa null sin datos válidos", () => {
    expect(estimateOneRepMax(null, 5)).toBeNull();
    expect(estimateOneRepMax(100, null)).toBeNull();
    expect(estimateOneRepMax(100, 0)).toBeNull();
    expect(estimateOneRepMax(0, 5)).toBeNull();
  });
});

describe("setRecordValues", () => {
  it("calcula los cuatro tipos de récord de una serie completa", () => {
    expect(setRecordValues(set())).toEqual({
      peso: 100,
      repeticiones: 5,
      volumen_serie: 500,
      one_rm_estimado: 116.67,
    });
  });

  it("ignora calentamientos y series no completadas", () => {
    expect(setRecordValues(set({ setType: "calentamiento" }))).toEqual({});
    expect(setRecordValues(set({ completed: false }))).toEqual({});
  });

  it("cuenta al fallo y drop set como series efectivas", () => {
    expect(setRecordValues(set({ setType: "al_fallo" })).peso).toBe(100);
    expect(setRecordValues(set({ setType: "drop_set" })).peso).toBe(100);
  });

  it("sin peso (peso corporal) solo aporta repeticiones", () => {
    expect(setRecordValues(set({ weightKg: null, reps: 12 }))).toEqual({ repeticiones: 12 });
  });
});

describe("detectNewRecords", () => {
  it("el primer registro de un ejercicio siempre es récord", () => {
    const records = detectNewRecords([set()], new Map());
    expect(records.map((r) => r.recordType).sort()).toEqual(
      ["one_rm_estimado", "peso", "repeticiones", "volumen_serie"]
    );
  });

  it("un empate no es récord", () => {
    const bests = new Map([
      [recordKey("bench", "peso"), 100],
      [recordKey("bench", "repeticiones"), 5],
      [recordKey("bench", "volumen_serie"), 500],
      [recordKey("bench", "one_rm_estimado"), 116.67],
    ]);
    expect(detectNewRecords([set()], bests)).toEqual([]);
  });

  it("solo reporta los tipos que se superan", () => {
    const bests = new Map([
      [recordKey("bench", "peso"), 100],
      [recordKey("bench", "repeticiones"), 10],
      [recordKey("bench", "volumen_serie"), 1000],
      [recordKey("bench", "one_rm_estimado"), 200],
    ]);
    const records = detectNewRecords([set({ weightKg: 102.5, reps: 1 })], bests);
    expect(records).toEqual([{ exerciseId: "bench", recordType: "peso", value: 102.5, workoutSetId: "set-1" }]);
  });

  it("con varias series que superan el mismo récord se queda la mejor", () => {
    const records = detectNewRecords(
      [set({ id: "a", weightKg: 100 }), set({ id: "b", weightKg: 110 }), set({ id: "c", weightKg: 105 })],
      new Map()
    );
    const peso = records.find((r) => r.recordType === "peso");
    expect(peso).toEqual({ exerciseId: "bench", recordType: "peso", value: 110, workoutSetId: "b" });
  });

  it("separa récords por ejercicio y no cuenta calentamientos", () => {
    const records = detectNewRecords(
      [set({ exerciseId: "squat", weightKg: 200, setType: "calentamiento" }), set({ exerciseId: "squat", weightKg: 140 })],
      new Map([[recordKey("bench", "peso"), 500]])
    );
    expect(records.find((r) => r.recordType === "peso")).toMatchObject({ exerciseId: "squat", value: 140 });
  });
});
