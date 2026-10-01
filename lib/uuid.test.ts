import { describe, expect, it } from "vitest";
import { createId } from "./uuid";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("createId", () => {
  it("usa crypto.randomUUID cuando existe", () => {
    expect(createId({ getRandomValues: crypto.getRandomValues.bind(crypto), randomUUID: () => "fijo" })).toBe("fijo");
  });

  it("genera un UUID v4 válido sin randomUUID (http://IP-local, contexto no seguro)", () => {
    const insecure = { getRandomValues: crypto.getRandomValues.bind(crypto) };
    const ids = new Set(Array.from({ length: 200 }, () => createId(insecure)));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });
});
