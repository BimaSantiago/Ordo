"use client";

import { deleteTask, saveTask, toggleTask } from "@/app/tareas/actions";
import { createHabit, saveQuickNote, saveWeight, setHabitLog } from "@/app/hoy/actions";
import { deleteBlock, saveBlock } from "@/app/horario/actions";
import { createCategoryQuick } from "@/app/materias/actions";
import { finishWorkout } from "@/app/gimnasio/entrenar/actions";
import { enqueue, flushOutbox, type ActionResult } from "@/lib/offline/outbox";

/**
 * Acciones que se pueden hacer sin señal. Todas son idempotentes (ids y fechas del cliente),
 * así que la cola puede reintentarlas. Agregar aquí cualquier acción nueva que deba funcionar offline.
 */
const EXECUTORS = {
  saveTask,
  toggleTask: (p: { taskId: string; completed: boolean }) => toggleTask(p.taskId, p.completed),
  deleteTask: (p: { taskId: string }) => deleteTask(p.taskId),
  createHabit,
  setHabitLog,
  saveWeight,
  saveQuickNote,
  saveBlock,
  deleteBlock: (p: { blockId: string }) => deleteBlock(p.blockId),
  createCategoryQuick,
  finishWorkout,
} satisfies Record<string, (payload: never) => Promise<ActionResult>>;

export type OfflineKind = keyof typeof EXECUTORS;
type PayloadOf<K extends OfflineKind> = Parameters<(typeof EXECUTORS)[K]>[0];
type ResultOf<K extends OfflineKind> = Awaited<ReturnType<(typeof EXECUTORS)[K]>>;

export type RunResult<K extends OfflineKind> =
  | { status: "done"; result: Extract<ResultOf<K>, { ok: true }> }
  | { status: "queued" }
  | { status: "error"; error: string };

/**
 * Ejecuta la acción si hay señal; si no hay (o la red falla a medio camino) la guarda en la
 * cola para sincronizarla después. Un rechazo del servidor se regresa como error, no se encola.
 */
export async function runOrQueue<K extends OfflineKind>(kind: K, payload: PayloadOf<K>, label: string): Promise<RunResult<K>> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await enqueue(kind, payload, label);
    return { status: "queued" };
  }

  try {
    const execute = EXECUTORS[kind] as (p: PayloadOf<K>) => Promise<ResultOf<K>>;
    const result = await execute(payload);
    if (!result.ok) return { status: "error", error: result.error };
    return { status: "done", result: result as Extract<ResultOf<K>, { ok: true }> };
  } catch {
    // La Server Action lanza cuando no llega al servidor (sin señal, señal intermitente).
    await enqueue(kind, payload, label);
    return { status: "queued" };
  }
}

export function syncPending() {
  return flushOutbox(EXECUTORS as never);
}
