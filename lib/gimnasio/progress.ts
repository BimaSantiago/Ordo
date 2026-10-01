import { estimateOneRepMax, isWorkingSet } from "./records";

export type ProgressSet = {
  setType: string;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
};

export type ProgressExercise = {
  exerciseId: string;
  primaryMuscleGroup: string | null;
  sets: ProgressSet[];
};

export type ProgressWorkout = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  exercises: ProgressExercise[];
};

function setVolume(set: ProgressSet): number {
  if (!isWorkingSet(set) || set.weightKg == null || set.reps == null) return 0;
  return set.weightKg * set.reps;
}

export function summarizeWorkout(workout: ProgressWorkout) {
  let volumeKg = 0;
  let workingSets = 0;
  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      if (!isWorkingSet(set)) continue;
      workingSets += 1;
      volumeKg += setVolume(set);
    }
  }
  const durationSeconds = workout.finishedAt
    ? Math.max(0, Math.floor((new Date(workout.finishedAt).getTime() - new Date(workout.startedAt).getTime()) / 1000))
    : 0;
  return { volumeKg, workingSets, durationSeconds };
}

/** Resumen de un conjunto de entrenamientos (el que llama decide el rango, p. ej. la semana actual). */
export function summarizeWorkouts(workouts: ProgressWorkout[]) {
  let volumeKg = 0;
  let workingSets = 0;
  const volumeByMuscle = new Map<string, number>();

  for (const workout of workouts) {
    const summary = summarizeWorkout(workout);
    volumeKg += summary.volumeKg;
    workingSets += summary.workingSets;
    for (const exercise of workout.exercises) {
      const exerciseVolume = exercise.sets.reduce((sum, set) => sum + setVolume(set), 0);
      if (exerciseVolume === 0) continue;
      const muscle = exercise.primaryMuscleGroup ?? "";
      volumeByMuscle.set(muscle, (volumeByMuscle.get(muscle) ?? 0) + exerciseVolume);
    }
  }

  return {
    sessions: workouts.length,
    workingSets,
    volumeKg,
    volumeByMuscle: [...volumeByMuscle.entries()]
      .map(([muscle, muscleVolume]) => ({ muscle: muscle || null, volumeKg: muscleVolume }))
      .sort((a, b) => b.volumeKg - a.volumeKg),
  };
}

export type ExerciseSession = {
  workoutId: string;
  localDate: string;
  sets: ProgressSet[];
};

export type ExerciseSessionPoint = {
  workoutId: string;
  localDate: string;
  maxWeightKg: number;
  bestOneRepMax: number;
  volumeKg: number;
};

/** Un punto por sesión para las gráficas por ejercicio, en orden cronológico. */
export function summarizeExerciseSessions(sessions: ExerciseSession[]): ExerciseSessionPoint[] {
  const points: ExerciseSessionPoint[] = [];

  for (const session of sessions) {
    let maxWeightKg = 0;
    let bestOneRepMax = 0;
    let volumeKg = 0;
    for (const set of session.sets) {
      if (!isWorkingSet(set) || set.weightKg == null || set.reps == null || set.weightKg <= 0) continue;
      maxWeightKg = Math.max(maxWeightKg, set.weightKg);
      bestOneRepMax = Math.max(bestOneRepMax, estimateOneRepMax(set.weightKg, set.reps) ?? 0);
      volumeKg += setVolume(set);
    }
    if (maxWeightKg === 0) continue;
    points.push({ workoutId: session.workoutId, localDate: session.localDate, maxWeightKg, bestOneRepMax, volumeKg });
  }

  return points.sort((a, b) => a.localDate.localeCompare(b.localDate));
}
