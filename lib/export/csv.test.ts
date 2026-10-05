import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

const BOM = "﻿";

describe("toCsv", () => {
  it("encabezado con todas las columnas y una fila por registro", () => {
    expect(toCsv([{ id: 1, name: "Leer" }, { id: 2, name: "Agua" }])).toBe(`${BOM}id,name\r\n1,Leer\r\n2,Agua\r\n`);
  });

  it("escapa comas, comillas y saltos de línea", () => {
    const csv = toCsv([{ body: 'Dijo "hola", y\nse fue' }]);
    expect(csv).toBe(`${BOM}body\r\n"Dijo ""hola"", y\nse fue"\r\n`);
  });

  it("null y undefined como vacío; arreglos y objetos como JSON; acentos intactos", () => {
    const csv = toCsv([{ a: null, b: undefined, days: [1, 3, 5], name: "Cálculo ñ" }]);
    expect(csv).toBe(`${BOM}a,b,days,name\r\n,,"[1,3,5]",Cálculo ñ\r\n`);
  });

  it("une columnas de filas distintas y conserva espacios al inicio/fin con comillas", () => {
    expect(toCsv([{ a: 1 }, { b: " x " }])).toBe(`${BOM}a,b\r\n1,\r\n," x "\r\n`);
  });

  it("sin filas solo regresa el BOM", () => {
    expect(toCsv([])).toBe(BOM);
  });
});
