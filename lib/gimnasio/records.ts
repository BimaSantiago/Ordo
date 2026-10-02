import { formatWeight, type WeightUnit } from "../units";

export type RecordType ="peso" | "repeticiones" | "one_rm_estimado" | "volumen_serie";

export const RECORD_TYPES: RecordType[] = ["peso", "repeticiones", "one_rm_estimado", "volumen_serie"];

export const RECORD_LABELS: Record<RecordType, string> = {
  peso: "Peso máximo",
  repeticiones: "Repeticiones",
  one_rm_estimado: "1RM estimado",
  volumen_serie: "Volumen de serie",
};

/** Forma mínima de una serie, compatible con el borrador en curso y con filas de `workout_sets`. */
export type RecordSet = {
  id: string;
  exerciseId: string;
  setType: string;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
};

export type NewRecord = {
  exerciseId: string;
  recordType: RecordType;
  value: number;
  workoutSetId: string;
};

/** Mejores valores vigentes, indexados con `recordKey(exerciseId, recordType)`. */
export type CurrentBests = Map<string, number>;

export function recordKey(exerciseId: string, recordType: RecordType): string {
  return `${exerciseId}:${recordType}`;
}

/** Igual que la columna `numeric(10, 2)`: así comparar contra lo guardado no falla por decimales. */
function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Las series de calentamiento no cuentan para récords ni volumen; al fallo y drop set sí. */
export function isWorkingSet(set: Pick<RecordSet, "setType" | "completed">): boolean {
  return set.completed && set.setType !== "calentamiento";
}

/** 1RM estimado con la fórmula de Epley: peso × (1 + reps / 30). Con 1 repetición es el peso mismo. */
export function estimateOneRepMax(weightKg: number | null, reps: number | null): number | null {
  if (weightKg == null || reps == null || weightKg <= 0 || reps <= 0) return null;
  if (reps === 1) return roundTo2(weightKg);
  return roundTo2(weightKg * (1 + reps / 30));
}

/** Valores de récord que aporta una serie; vacío si no cuenta (incompleta, calentamiento o sin datos). */
export function setRecordValues(set: RecordSet): Partial<Record<RecordType, number>> {
  if (!isWorkingSet(set)) return {};
  const values: Partial<Record<RecordType, number>> = {};
  const { weightKg, reps } = set;

  // Repeticiones cuenta aunque no haya peso (ejercicios con peso corporal).
  if (reps != null && reps > 0) values.repeticiones = reps;

  if (weightKg != null && weightKg > 0 && reps != null && reps > 0) {
    values.peso = roundTo2(weightKg);
    values.volumen_serie = roundTo2(weightKg * reps);
    const oneRm = estimateOneRepMax(weightKg, reps);
    if (oneRm != null) values.one_rm_estimado = oneRm;
  }

  return values;
}

/**
 * Récords que rompen las series de un entrenamiento contra los mejores valores vigentes.
 * Solo superar cuenta (un empate no es récord) y, si varias series superan el mismo récord,
 * se queda la mejor.
 */
export function detectNewRecords(sets: RecordSet[], currentBests: CurrentBests): NewRecord[] {
  const best = new Map<string, NewRecord>();

  for (const set of sets) {
    const values = setRecordValues(set);
    for (const recordType of RECORD_TYPES) {
      const value = values[recordType];
      if (value == null) continue;
      const key = recordKey(set.exerciseId, recordType);
      const previous = currentBests.get(key);
      if (previous != null && value <= previous) continue;
      const candidate = best.get(key);
      if (candidate && value <= candidate.value) continue;
      best.set(key, { exerciseId: set.exerciseId, recordType, value, workoutSetId: set.id });
    }
  }

  return [...best.values()];
}

/** Los récords se guardan en kg; se muestran en la unidad del usuario. */
export function formatRecordValue(recordType: RecordType, value: number, unit: WeightUnit = "kg"): string {
  return recordType === "repeticiones" ? `${value} reps` : formatWeight(value, unit);
}
