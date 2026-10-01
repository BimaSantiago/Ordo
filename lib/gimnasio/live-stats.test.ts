import { describe, expect, it } from "vitest";
import { calculateElapsedSeconds, calculateWorkoutVolume, countCompletedSets, formatElapsed } from "./live-stats";
import { createDraftExercise, createDraftSet } from "./workout-draft";

describe("calculateElapsedSeconds", () => {
  it("calcula segundos transcurridos entre inicio y ahora", () => {
    const startedAt = new Date("2026-01-01T10:00:00Z").toISOString();
    const now = new Date("2026-01-01T10:05:30Z");
    expect(calculateElapsedSeconds(startedAt, now)).toBe(330);
  });

  it("nunca regresa negativos si el reloj local se adelanta", () => {
    const startedAt = new Date("2026-01-01T10:05:00Z").toISOString();
    const now = new Date("2026-01-01T10:00:00Z");
    expect(calculateElapsedSeconds(startedAt, now)).toBe(0);
  });
});

describe("formatElapsed", () => {
  it("formatea minutos:segundos cuando dura menos de una hora", () => {
    expect(formatElapsed(90)).toBe("1:30");
  });

  it("formatea horas:minutos:segundos cuando dura una hora o más", () => {
    expect(formatElapsed(3661)).toBe("1:01:01");
  });
});

describe("calculateWorkoutVolume", () => {
  it("suma peso x reps solo de series completadas", () => {
    const exercise = createDraftExercise("ex-1", "Bench Press", 0);
    const completed = { ...createDraftSet(0), weightKg: 100, reps: 5, completed: true };
    const incomplete = { ...createDraftSet(1), weightKg: 999, reps: 999, completed: false };
    exercise.sets.push(completed, incomplete);

    expect(calculateWorkoutVolume([exercise])).toBe(500);
  });

  it("ignora series sin peso o reps capturados", () => {
    const exercise = createDraftExercise("ex-1", "Bench Press", 0);
    exercise.sets.push({ ...createDraftSet(0), completed: true, weightKg: null, reps: 5 });

    expect(calculateWorkoutVolume([exercise])).toBe(0);
  });
});

describe("countCompletedSets", () => {
  it("cuenta series completadas entre varios ejercicios", () => {
    const a = createDraftExercise("ex-1", "Bench Press", 0);
    a.sets.push({ ...createDraftSet(0), completed: true }, { ...createDraftSet(1), completed: false });
    const b = createDraftExercise("ex-2", "Squat", 1);
    b.sets.push({ ...createDraftSet(0), completed: true });

    expect(countCompletedSets([a, b])).toBe(2);
  });
});
