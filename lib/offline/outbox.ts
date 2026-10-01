import Dexie, { type Table } from "dexie";
import { createId } from "../uuid";

/**
 * Cola de escrituras hechas sin conexión (sección 7 de CLAUDE.md: "registrar sin señal y
 * sincronizar después"). Cada elemento es una Server Action idempotente (ids y fechas del
 * cliente, upserts), así que reintentarla no duplica nada; gana la última escritura.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

export type OutboxItem = {
  seq?: number;
  id: string;
  kind: string;
  payload: unknown;
  createdAt: string;
  /** Texto corto para mostrar al usuario si la acción se descarta. */
  label: string;
};

export type Executors = Record<string, (payload: never) => Promise<ActionResult>>;

export type FlushResult = {
  synced: number;
  /** Rechazadas por el servidor ({ ok: false }): no tiene caso reintentarlas. */
  dropped: { item: OutboxItem; error: string }[];
  /** true si se detuvo por un error de red; los pendientes se quedan para el siguiente intento. */
  stopped: boolean;
};

class OutboxDatabase extends Dexie {
  items!: Table<OutboxItem, number>;

  constructor() {
    super("life-os-outbox");
    this.version(1).stores({ items: "++seq, id" });
  }
}

let db: OutboxDatabase | null = null;
function getDb(): OutboxDatabase {
  if (!db) db = new OutboxDatabase();
  return db;
}

const listeners = new Set<() => void>();

/** Avisa a la interfaz (contador de pendientes) cuando cambia la cola. */
export function subscribeOutbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) listener();
}

export async function enqueue(kind: string, payload: unknown, label: string): Promise<void> {
  await getDb().items.add({ id: createId(), kind, payload, label, createdAt: new Date().toISOString() });
  notify();
}

export async function pendingCount(): Promise<number> {
  return getDb().items.count();
}

export async function clearOutbox(): Promise<void> {
  await getDb().items.clear();
  notify();
}

let flushing: Promise<FlushResult> | null = null;

/**
 * Reproduce la cola en orden (FIFO). Un error de red (la acción lanza) detiene la cola para no
 * aplicar cambios fuera de orden; un rechazo del servidor descarta solo ese elemento.
 * Si ya hay una sincronización en curso, regresa esa misma en vez de correr dos a la vez.
 */
export function flushOutbox(executors: Executors): Promise<FlushResult> {
  if (!flushing) {
    flushing = runFlush(executors).finally(() => {
      flushing = null;
    });
  }
  return flushing;
}

async function runFlush(executors: Executors): Promise<FlushResult> {
  const result: FlushResult = { synced: 0, dropped: [], stopped: false };
  const items = await getDb().items.orderBy("seq").toArray();

  for (const item of items) {
    const execute = executors[item.kind] as ((payload: unknown) => Promise<ActionResult>) | undefined;
    if (!execute) {
      result.dropped.push({ item, error: `Acción desconocida: ${item.kind}` });
      await getDb().items.delete(item.seq!);
      continue;
    }

    let outcome: ActionResult;
    try {
      outcome = await execute(item.payload);
    } catch {
      result.stopped = true;
      break;
    }

    await getDb().items.delete(item.seq!);
    if (outcome.ok) result.synced += 1;
    else result.dropped.push({ item, error: outcome.error });
  }

  notify();
  return result;
}
