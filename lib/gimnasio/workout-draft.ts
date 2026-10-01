import Dexie, { type Table } from "dexie";
import { createId } from "../uuid";

export type SetType = "calentamiento" | "normal" | "al_fallo" | "drop_set";

export const SET_TYPE_LABELS: Record<SetType, string> = {
  calentamiento: "Calentamiento",
  normal: "Normal",
  al_fallo: "Al fallo",
  drop_set: "Drop set",
};

export type DraftSet = {
  id: string;
  position: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
};

export type DraftExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  position: number;
  notes: string | null;
  sets: DraftSet[];
};

export type WorkoutDraft = {
  /** Llave fija en Dexie (siempre "active"); no es el id del entrenamiento. */
  id: string;
  /** UUID con el que se guarda en `workouts.id`; estable entre recargas para que reintentar sea idempotente. */
  workoutId: string;
  routineId: string | null;
  name: string | null;
  notes: string | null;
  startedAt: string;
  exercises: DraftExercise[];
};

class WorkoutDraftDatabase extends Dexie {
  drafts!: Table<WorkoutDraft, string>;

  constructor() {
    super("life-os-gimnasio");
    this.version(1).stores({ drafts: "id" });
  }
}

/**
 * Solo puede haber un entrenamiento en curso a la vez, por eso se usa un id fijo:
 * evita tener que buscar "el draft activo" entre varios registros huérfanos.
 */
const ACTIVE_DRAFT_ID = "active";

let db: WorkoutDraftDatabase | null = null;
function getDb(): WorkoutDraftDatabase {
  if (!db) db = new WorkoutDraftDatabase();
  return db;
}

export async function getActiveDraft(): Promise<WorkoutDraft | undefined> {
  const draft = await getDb().drafts.get(ACTIVE_DRAFT_ID);
  // Borradores creados antes de que existiera `workoutId`.
  if (draft && !draft.workoutId) return { ...draft, workoutId: createId() };
  return draft;
}

export async function saveActiveDraft(draft: WorkoutDraft): Promise<void> {
  await getDb().drafts.put({ ...draft, id: ACTIVE_DRAFT_ID });
}

export async function clearActiveDraft(): Promise<void> {
  await getDb().drafts.delete(ACTIVE_DRAFT_ID);
}

export function createDraft(options: {
  routineId?: string | null;
  name?: string | null;
  exercises?: DraftExercise[];
}): WorkoutDraft {
  return {
    id: ACTIVE_DRAFT_ID,
    workoutId: createId(),
    routineId: options.routineId ?? null,
    name: options.name ?? null,
    notes: null,
    startedAt: new Date().toISOString(),
    exercises: options.exercises ?? [],
  };
}

export function createDraftSet(position: number, setType: SetType = "normal"): DraftSet {
  return {
    id: createId(),
    position,
    setType,
    weightKg: null,
    reps: null,
    rpe: null,
    completed: false,
  };
}

export function createDraftExercise(
  exerciseId: string,
  exerciseName: string,
  position: number
): DraftExercise {
  return {
    id: createId(),
    exerciseId,
    exerciseName,
    position,
    notes: null,
    sets: [],
  };
}
