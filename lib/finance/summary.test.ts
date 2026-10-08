import { describe, expect, it } from "vitest";
import {
  addMonths,
  budgetStatus,
  expensesByCategory,
  groupByDay,
  isValidMonth,
  monthlyTotals,
  monthRange,
  summarize,
  type TransactionLike,
} from "./summary";

const t = (kind: TransactionLike["kind"], amount: number, localDate: string, categoryId: string | null = null): TransactionLike => ({
  kind,
  amount,
  localDate,
  categoryId,
});

describe("meses", () => {
  it("suma y resta meses cruzando el año", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-10", -5)).toBe("2026-05");
  });

  it("rango con el último día correcto (incluye bisiestos)", () => {
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthRange("2026-10")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });

  it("valida YYYY-MM", () => {
    expect(isValidMonth("2026-10")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-1")).toBe(false);
    expect(isValidMonth(undefined)).toBe(false);
  });
});

describe("summarize", () => {
  it("las transferencias no cuentan como gasto ni ingreso", () => {
    const result = summarize([
      t("ingreso", 1000, "2026-10-01"),
      t("gasto", 250.1, "2026-10-02"),
      t("gasto", 0.2, "2026-10-02"),
      t("transferencia", 500, "2026-10-03"),
    ]);
    expect(result).toEqual({ income: 1000, expense: 250.3, net: 749.7 });
  });

  it("sin movimientos todo es cero", () => {
    expect(summarize([])).toEqual({ income: 0, expense: 0, net: 0 });
  });
});

describe("expensesByCategory", () => {
  it("solo gastos, de mayor a menor, con sin categoría como null", () => {
    expect(
      expensesByCategory([
        t("gasto", 100, "2026-10-01", "comida"),
        t("gasto", 50, "2026-10-02", "comida"),
        t("gasto", 300, "2026-10-02", "ocio"),
        t("gasto", 20, "2026-10-02"),
        t("ingreso", 999, "2026-10-02", "comida"),
      ])
    ).toEqual([
      { categoryId: "ocio", total: 300 },
      { categoryId: "comida", total: 150 },
      { categoryId: null, total: 20 },
    ]);
  });
});

describe("groupByDay", () => {
  it("días del más reciente al más antiguo, con el neto de cada uno", () => {
    const groups = groupByDay([
      t("gasto", 100, "2026-10-01"),
      t("ingreso", 500, "2026-10-03"),
      t("gasto", 50, "2026-10-03"),
      t("transferencia", 70, "2026-10-03"),
    ]);
    expect(groups.map((g) => [g.localDate, g.net, g.items.length])).toEqual([
      ["2026-10-03", 450, 3],
      ["2026-10-01", -100, 1],
    ]);
  });
});

describe("monthlyTotals", () => {
  it("incluye meses vacíos y descarta los que quedan fuera", () => {
    expect(
      monthlyTotals(
        [t("gasto", 100, "2026-08-15"), t("ingreso", 300, "2026-10-01"), t("gasto", 999, "2026-05-31")],
        "2026-08",
        "2026-10"
      )
    ).toEqual([
      { month: "2026-08", income: 0, expense: 100 },
      { month: "2026-09", income: 0, expense: 0 },
      { month: "2026-10", income: 300, expense: 0 },
    ]);
  });
});

describe("budgetStatus", () => {
  it("ok por debajo del 80%", () => {
    expect(budgetStatus(799, 1000)).toEqual({ ratio: 0.799, remaining: 201, level: "ok" });
  });

  it("alerta del 80% al 100% (justo en el límite todavía no se excede)", () => {
    expect(budgetStatus(800, 1000).level).toBe("alerta");
    expect(budgetStatus(1000, 1000).level).toBe("alerta");
  });

  it("excedido al pasar el límite, con restante negativo", () => {
    expect(budgetStatus(1200.5, 1000)).toEqual({ ratio: 1.2005, remaining: -200.5, level: "excedido" });
  });
});
