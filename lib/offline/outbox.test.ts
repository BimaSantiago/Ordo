import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearOutbox, enqueue, flushOutbox, pendingCount, subscribeOutbox, type ActionResult } from "./outbox";

const ok = async (): Promise<ActionResult> => ({ ok: true });

describe("outbox", () => {
  beforeEach(async () => {
    await clearOutbox();
  });

  it("reproduce los pendientes en el orden en que se hicieron", async () => {
    const calls: string[] = [];
    await enqueue("a", { n: 1 }, "A1");
    await enqueue("b", { n: 2 }, "B2");
    await enqueue("a", { n: 3 }, "A3");

    const record = (kind: string) => async (payload: { n: number }): Promise<ActionResult> => {
      calls.push(`${kind}${payload.n}`);
      return { ok: true };
    };
    const result = await flushOutbox({ a: record("a"), b: record("b") });

    expect(calls).toEqual(["a1", "b2", "a3"]);
    expect(result).toMatchObject({ synced: 3, dropped: [], stopped: false });
    expect(await pendingCount()).toBe(0);
  });

  it("se detiene ante un error de red y conserva ese y los siguientes", async () => {
    await enqueue("a", 1, "uno");
    await enqueue("a", 2, "dos");
    await enqueue("a", 3, "tres");

    let calls = 0;
    const flaky = async (n: number): Promise<ActionResult> => {
      calls += 1;
      if (n === 2) throw new TypeError("Failed to fetch");
      return { ok: true };
    };

    const result = await flushOutbox({ a: flaky });
    expect(result).toMatchObject({ synced: 1, stopped: true });
    expect(calls).toBe(2);
    expect(await pendingCount()).toBe(2);

    // Al volver la señal se reintenta desde el que falló, sin repetir el primero.
    const done: number[] = [];
    await flushOutbox({ a: async (n: number) => (done.push(n), { ok: true }) });
    expect(done).toEqual([2, 3]);
    expect(await pendingCount()).toBe(0);
  });

  it("descarta lo que el servidor rechaza y sigue con lo demás", async () => {
    await enqueue("a", "malo", "Tarea sin título");
    await enqueue("a", "bueno", "Otra tarea");

    const result = await flushOutbox({
      a: async (value: string): Promise<ActionResult> =>
        value === "malo" ? { ok: false, error: "Escribe un título." } : { ok: true },
    });

    expect(result.synced).toBe(1);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]).toMatchObject({ error: "Escribe un título.", item: { label: "Tarea sin título" } });
    expect(await pendingCount()).toBe(0);
  });

  it("no corre dos sincronizaciones a la vez (no duplica envíos)", async () => {
    await enqueue("a", 1, "uno");
    const execute = vi.fn(ok);
    const [first, second] = await Promise.all([flushOutbox({ a: execute }), flushOutbox({ a: execute })]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it("avisa a los suscriptores cuando cambia la cola", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeOutbox(listener);
    await enqueue("a", 1, "uno");
    await flushOutbox({ a: ok });
    unsubscribe();
    await enqueue("a", 2, "dos");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
