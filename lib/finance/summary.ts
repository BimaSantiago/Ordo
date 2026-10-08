import { roundMoney } from "./money";

export type TransactionKind = "gasto" | "ingreso" | "transferencia";

export type TransactionLike = {
  kind: TransactionKind;
  amount: number;
  localDate: string;
  categoryId: string | null;
};

/** Mes como "YYYY-MM". */
export function monthOf(localDate: string): string {
  return localDate.slice(0, 7);
}

export function isValidMonth(value: string | undefined | null): value is string {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12;
}

export function addMonths(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const index = year * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Primer y último día (YYYY-MM-DD) del mes, para filtrar `local_date`. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, m - 1, 1))
  );
}

/** Ingresos, gastos y balance. Las transferencias mueven dinero entre cuentas propias: no cuentan. */
export function summarize(transactions: TransactionLike[]) {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.kind === "ingreso") income += t.amount;
    else if (t.kind === "gasto") expense += t.amount;
  }
  return { income: roundMoney(income), expense: roundMoney(expense), net: roundMoney(income - expense) };
}

/** Gasto por categoría (null = sin categoría), de mayor a menor. */
export function expensesByCategory(transactions: TransactionLike[]): { categoryId: string | null; total: number }[] {
  const totals = new Map<string | null, number>();
  for (const t of transactions) {
    if (t.kind !== "gasto") continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
  }
  return [...totals.entries()]
    .map(([categoryId, total]) => ({ categoryId, total: roundMoney(total) }))
    .sort((a, b) => b.total - a.total);
}

/** Agrupa por día, del más reciente al más antiguo, con el neto del día (sin transferencias). */
export function groupByDay<T extends TransactionLike>(transactions: T[]): { localDate: string; net: number; items: T[] }[] {
  const days = new Map<string, T[]>();
  for (const t of transactions) {
    const list = days.get(t.localDate);
    if (list) list.push(t);
    else days.set(t.localDate, [t]);
  }
  return [...days.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([localDate, items]) => ({ localDate, net: summarize(items).net, items }));
}

/** Totales por mes para la tendencia, incluyendo meses sin movimientos (en orden cronológico). */
export function monthlyTotals(transactions: TransactionLike[], fromMonth: string, toMonth: string) {
  const rows = new Map<string, { month: string; income: number; expense: number }>();
  for (let month = fromMonth; month <= toMonth; month = addMonths(month, 1)) {
    rows.set(month, { month, income: 0, expense: 0 });
  }
  for (const t of transactions) {
    const row = rows.get(monthOf(t.localDate));
    if (!row) continue;
    if (t.kind === "ingreso") row.income += t.amount;
    else if (t.kind === "gasto") row.expense += t.amount;
  }
  return [...rows.values()].map((row) => ({ ...row, income: roundMoney(row.income), expense: roundMoney(row.expense) }));
}

export type BudgetLevel = "ok" | "alerta" | "excedido";

/** Avance del presupuesto: alerta desde el 80%, excedido al pasar el 100%. */
export function budgetStatus(spent: number, limit: number): { ratio: number; remaining: number; level: BudgetLevel } {
  const ratio = limit > 0 ? spent / limit : 0;
  const level: BudgetLevel = ratio > 1 ? "excedido" : ratio >= 0.8 ? "alerta" : "ok";
  return { ratio, remaining: roundMoney(limit - spent), level };
}
