import Dexie, { type Table } from "dexie";

export type SetType = "calentamiento" | "normal" | "al_fallo" | "drop_set";

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
  id: string;
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
  return getDb().drafts.get(ACTIVE_DRAFT_ID);
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
    routineId: options.routineId ?? null,
    name: options.name ?? null,
    notes: null,
    startedAt: new Date().toISOString(),
    exercises: options.exercises ?? [],
  };
}

export function createDraftSet(position: number, setType: SetType = "normal"): DraftSet {
  return {
    id: crypto.randomUUID(),
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
    id: crypto.randomUUID(),
    exerciseId,
    exerciseName,
    position,
    notes: null,
    sets: [],
  };
}
