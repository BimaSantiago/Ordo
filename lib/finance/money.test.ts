import { describe, expect, it } from "vitest";
import { formatMoney, parseAmount, roundMoney, toAmountInput } from "./money";

describe("parseAmount", () => {
  it("enteros y decimales con punto", () => {
    expect(parseAmount("150")).toBe(150);
    expect(parseAmount("99.5")).toBe(99.5);
    expect(parseAmount("0.10")).toBe(0.1);
  });

  it("acepta signo de pesos y espacios", () => {
    expect(parseAmount(" $ 1 250 ")).toBe(1250);
  });

  it("coma decimal del teclado (1 o 2 dígitos después)", () => {
    expect(parseAmount("99,5")).toBe(99.5);
    expect(parseAmount("99,50")).toBe(99.5);
  });

  it("coma de miles", () => {
    expect(parseAmount("1,250")).toBe(1250);
    expect(parseAmount("1,250,000")).toBe(1250000);
    expect(parseAmount("1,250.75")).toBe(1250.75);
  });

  it("redondea a centavos", () => {
    expect(parseAmount("10.005")).toBe(10.01);
    expect(parseAmount("10.004")).toBe(10);
  });

  it("rechaza vacíos, cero, negativos y texto", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("1.2.3")).toBeNull();
    expect(parseAmount("0.001")).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formato MXN con centavos", () => {
    expect(formatMoney(1250.5)).toBe("$1,250.50");
  });

  it("redondeado para resúmenes", () => {
    expect(formatMoney(1250.5, { round: true })).toBe("$1,251");
  });

  it("negativos con signo menos y positivos con + si se pide", () => {
    expect(formatMoney(-300)).toBe("−$300.00");
    expect(formatMoney(300, { signed: true })).toBe("+$300.00");
    expect(formatMoney(0, { signed: true })).toBe("$0.00");
  });
});

describe("redondeo e input", () => {
  it("evita errores de punto flotante", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1.005)).toBe(1.01);
  });

  it("valor del input sin separadores", () => {
    expect(toAmountInput(1250)).toBe("1250");
    expect(toAmountInput(99.5)).toBe("99.5");
  });
});
