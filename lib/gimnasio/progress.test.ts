import { describe, expect, it } from "vitest";
import { summarizeExerciseSessions, summarizeWorkout, summarizeWorkouts, type ProgressSet } from "./progress";

const working = (weightKg: number, reps: number): ProgressSet => ({ setType: "normal", weightKg, reps, completed: true });
const warmup = (weightKg: number, reps: number): ProgressSet => ({ setType: "calentamiento", weightKg, reps, completed: true });

describe("summarizeWorkout", () => {
  it("suma volumen y series efectivas, sin calentamientos ni incompletas", () => {
    const summary = summarizeWorkout({
      id: "w1",
      startedAt: "2026-09-28T14:00:00Z",
      finishedAt: "2026-09-28T15:05:00Z",
      exercises: [
        {
          exerciseId: "bench",
          primaryMuscleGroup: "chest",
          sets: [warmup(40, 10), working(80, 8), { ...working(90, 5), completed: false }],
        },
      ],
    });
    expect(summary).toEqual({ volumeKg: 640, workingSets: 1, durationSeconds: 3900 });
  });
});

describe("summarizeWorkouts", () => {
  it("agrupa volumen por grupo muscular, de mayor a menor", () => {
    const summary = summarizeWorkouts([
      {
        id: "w1",
        startedAt: "2026-09-28T14:00:00Z",
        finishedAt: null,
        exercises: [
          { exerciseId: "bench", primaryMuscleGroup: "chest", sets: [working(100, 5)] },
          { exerciseId: "squat", primaryMuscleGroup: "quadriceps", sets: [working(120, 5)] },
        ],
      },
      {
        id: "w2",
        startedAt: "2026-09-30T14:00:00Z",
        finishedAt: null,
        exercises: [{ exerciseId: "fly", primaryMuscleGroup: "chest", sets: [working(20, 10)] }],
      },
    ]);
    expect(summary.sessions).toBe(2);
    expect(summary.workingSets).toBe(3);
    expect(summary.volumeKg).toBe(1300);
    expect(summary.volumeByMuscle).toEqual([
      { muscle: "chest", volumeKg: 700 },
      { muscle: "quadriceps", volumeKg: 600 },
    ]);
  });
});

describe("summarizeExerciseSessions", () => {
  it("da un punto por sesión en orden cronológico con peso máximo, 1RM y volumen", () => {
    const points = summarizeExerciseSessions([
      { workoutId: "w2", localDate: "2026-09-30", sets: [working(100, 5), working(105, 3)] },
      { workoutId: "w1", localDate: "2026-09-23", sets: [working(95, 5)] },
    ]);
    expect(points).toEqual([
      { workoutId: "w1", localDate: "2026-09-23", maxWeightKg: 95, bestOneRepMax: 110.83, volumeKg: 475 },
      { workoutId: "w2", localDate: "2026-09-30", maxWeightKg: 105, bestOneRepMax: 116.67, volumeKg: 815 },
    ]);
  });

  it("omite sesiones sin series efectivas con peso", () => {
    expect(summarizeExerciseSessions([{ workoutId: "w1", localDate: "2026-09-30", sets: [warmup(40, 10)] }])).toEqual([]);
  });
});
