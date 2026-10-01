import { isWorkingSet } from "./records";
import type { DraftExercise } from "./workout-draft";

export function calculateElapsedSeconds(startedAt: string, now: Date = new Date()): number {
  const started = new Date(startedAt).getTime();
  const elapsed = Math.floor((now.getTime() - started) / 1000);
  return Math.max(0, elapsed);
}

export function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Volumen = peso x repeticiones de series completadas, sin calentamientos (igual que el historial). */
export function calculateWorkoutVolume(exercises: DraftExercise[]): number {
  return exercises.reduce((total, exercise) => {
    const exerciseVolume = exercise.sets.reduce((sum, set) => {
      if (!isWorkingSet(set) || set.weightKg == null || set.reps == null) return sum;
      return sum + set.weightKg * set.reps;
    }, 0);
    return total + exerciseVolume;
  }, 0);
}

export function countCompletedSets(exercises: DraftExercise[]): number {
  return exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.completed).length,
    0
  );
}
