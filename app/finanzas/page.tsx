import Link from "next/link";
import { BarChart3, ChevronLeft, ChevronRight, Landmark, ListOrdered, PieChart, Plus, Settings2, Target } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { QuickAddButton } from "@/components/quick-add/quick-add-button";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { loadAccounts, loadBudgets, loadCategories, loadTransactions } from "@/lib/finance/load";
import { formatMoney } from "@/lib/finance/money";
import {
  addMonths,
  budgetStatus,
  expensesByCategory,
  formatMonth,
  groupByDay,
  isValidMonth,
  monthOf,
  monthlyTotals,
  monthRange,
  summarize,
} from "@/lib/finance/summary";
import { addDaysToLocalDate, formatDisplayDate, getLocalDateString } from "@/lib/date";
import { cn } from "@/lib/cn";
import { TransactionRow } from "./transaction-row";
import { MonthlyChart } from "@/components/finance/monthly-chart";

export default async function FinanzasPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const today = getLocalDateString();
  const currentMonth = monthOf(today);
  const month = isValidMonth(mes) ? mes : currentMonth;
  const { from, to } = monthRange(month);

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) await ensureFinanceDefaults(supabase, auth.user.id);

  // Tendencia: el mes visto y los 5 anteriores.
  const trendFrom = addMonths(month, -5);
  const [accounts, categories, trendTransactions, budgets] = await Promise.all([
    loadAccounts(supabase),
    loadCategories(supabase),
    loadTransactions(supabase, monthRange(trendFrom).from, to),
    loadBudgets(supabase),
  ]);
  const transactions = trendTransactions.filter((t) => t.localDate >= from);
  const trend = monthlyTotals(trendTransactions, trendFrom, month);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const summary = summarize(transactions);
  const byCategory = expensesByCategory(transactions);
  const spentByCategory = new Map(byCategory.map((row) => [row.categoryId, row.total]));
  const days = groupByDay(transactions);
  const activeAccounts = accounts.filter((a) => !a.archived);
  const totalBalance = activeAccounts.reduce((sum, a) => sum + a.balance, 0);

  const budgetRows = categories
    .filter((c) => c.kind === "gasto" && budgets.has(c.id))
    .map((category) => {
      const limit = budgets.get(category.id)!;
      const spent = spentByCategory.get(category.id) ?? 0;
      return { category, limit, spent, ...budgetStatus(spent, limit) };
    })
    .sort((a, b) => b.ratio - a.ratio);

  const maxCategory = byCategory[0]?.total ?? 0;

  return (
    <Page>
      <PageHeader
        title="Finanzas"
        subtitle="Cuentas, gastos y presupuesto"
        backHref="/mas"
        backLabel="Más"
        action={
          <QuickAddButton prefill={{ tab: "dinero" }} className="bg-primary text-on-primary">
            <Plus size={18} aria-hidden />
            Movimiento
          </QuickAddButton>
        }
      />

      <nav aria-label="Mes" className="flex items-center justify-between">
        <Link
          href={`/finanzas?mes=${addMonths(month, -1)}`}
          aria-label="Mes anterior"
          className="pressable flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface"
        >
          <ChevronLeft size={20} aria-hidden />
        </Link>
        <p className="font-semibold first-letter:uppercase">{formatMonth(month)}</p>
        {month < currentMonth ? (
          <Link
            href={`/finanzas?mes=${addMonths(month, 1)}`}
            aria-label="Mes siguiente"
            className="pressable flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface"
          >
            <ChevronRight size={20} aria-hidden />
          </Link>
        ) : (
          <span className="h-11 w-11" aria-hidden />
        )}
      </nav>

      <Card className="grid grid-cols-3 divide-x divide-line py-3">
        <Stat label="Ingresos" value={formatMoney(summary.income, { round: true })} className="text-success" />
        <Stat label="Gastos" value={formatMoney(summary.expense, { round: true })} />
        <Stat
          label="Balance"
          value={formatMoney(summary.net, { round: true, signed: true })}
          className={summary.net < 0 ? "text-danger" : undefined}
        />
      </Card>

      <section className="space-y-2">
        <SectionTitle
          icon={<Landmark size={16} aria-hidden />}
          action={
            <Link href="/finanzas/cuentas" className="pressable inline-flex min-h-9 items-center gap-1 px-1 text-sm font-semibold text-primary">
              <Settings2 size={16} aria-hidden />
              Cuentas
            </Link>
          }
        >
          Saldo actual · {formatMoney(totalBalance)}
        </SectionTitle>
        <div className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none]">
          {activeAccounts.map((account) => (
            <Link
              key={account.id}
              href="/finanzas/cuentas"
              className="pressable min-w-36 shrink-0 rounded-2xl border border-line bg-surface px-3 py-2.5"
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: account.color }} />
                <span className="truncate">{account.name}</span>
              </span>
              <span className={cn("block text-lg font-bold tabular-nums", account.balance < 0 && "text-danger")}>
                {formatMoney(account.balance)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <SectionTitle
          icon={<Target size={16} aria-hidden />}
          action={
            <Link href="/finanzas/categorias" className="pressable inline-flex min-h-9 items-center px-1 text-sm font-semibold text-primary">
              {budgetRows.length > 0 ? "Editar" : "Definir"}
            </Link>
          }
        >
          Presupuesto del mes
        </SectionTitle>
        {budgetRows.length > 0 ? (
          <Card className="divide-y divide-line">
            {budgetRows.map(({ category, limit, spent, ratio, remaining, level }) => (
              <div key={category.id} className="space-y-1.5 px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                    <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="truncate">{category.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {formatMoney(spent, { round: true })} / {formatMoney(limit, { round: true })}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-surface-2"
                  role="progressbar"
                  aria-label={`${category.name}: ${Math.round(ratio * 100)}% del presupuesto`}
                  aria-valuenow={Math.round(ratio * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      level === "ok" ? "bg-primary" : level === "alerta" ? "bg-accent" : "bg-danger"
                    )}
                    style={{ width: `${Math.min(ratio, 1) * 100}%` }}
                  />
                </div>
                <p className={cn("text-xs", level === "excedido" ? "font-semibold text-danger" : "text-muted")}>
                  {level === "excedido"
                    ? `Te pasaste por ${formatMoney(-remaining, { round: true })}`
                    : `Te quedan ${formatMoney(remaining, { round: true })}${level === "alerta" ? " · cerca del límite" : ""}`}
                </p>
              </div>
            ))}
          </Card>
        ) : (
          <Card className="px-4 py-4 text-sm text-muted">
            Pon un límite mensual a tus categorías (p. ej. Comida $2,000) para ver cuánto te queda.
          </Card>
        )}
      </section>

      {byCategory.length > 0 && (
        <section className="space-y-2">
          <SectionTitle icon={<PieChart size={16} aria-hidden />}>Gasto por categoría</SectionTitle>
          <Card className="space-y-3 px-3 py-3">
            {byCategory.map(({ categoryId, total }) => {
              const category = categoryId ? categoryById.get(categoryId) : undefined;
              return (
                <div key={categoryId ?? "none"} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{category?.name ?? "Sin categoría"}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatMoney(total, { round: true })}
                      <span className="ml-1.5 text-xs text-muted">{Math.round((total / summary.expense) * 100)}%</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(total / maxCategory) * 100}%`, backgroundColor: category?.color ?? "var(--muted)" }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      <section className="space-y-2">
        <SectionTitle icon={<BarChart3 size={16} aria-hidden />}>Últimos 6 meses</SectionTitle>
        <Card className="px-2 py-3">
          <MonthlyChart data={trend} />
        </Card>
      </section>

      <section className="space-y-2">
        <SectionTitle icon={<ListOrdered size={16} aria-hidden />}>Movimientos</SectionTitle>
        {days.length === 0 ? (
          <Card className="px-4 py-5 text-center text-sm text-muted">
            Sin movimientos en este mes. Registra uno con el botón +.
          </Card>
        ) : (
          days.map((day) => (
            <div key={day.localDate} className="space-y-1.5">
              <div className="flex items-baseline justify-between px-1 text-xs font-semibold text-muted">
                <span className="first-letter:uppercase">
                  {day.localDate === today
                    ? "Hoy"
                    : day.localDate === addDaysToLocalDate(today, -1)
                      ? "Ayer"
                      : formatDisplayDate(day.localDate)}
                </span>
                {day.net !== 0 && <span className="tabular-nums">{formatMoney(day.net, { signed: true })}</span>}
              </div>
              <Card className="divide-y divide-line">
                {day.items.map((transaction) => {
                  const account = accountById.get(transaction.accountId);
                  const category = transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined;
                  const isTransfer = transaction.kind === "transferencia";
                  const title = isTransfer
                    ? "Transferencia"
                    : (category?.name ?? (transaction.kind === "ingreso" ? "Ingreso" : "Gasto"));
                  const accounts = isTransfer
                    ? `${account?.name ?? "?"} → ${accountById.get(transaction.toAccountId ?? "")?.name ?? "?"}`
                    : (account?.name ?? "");
                  return (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      title={title}
                      subtitle={transaction.note ? `${transaction.note} · ${accounts}` : accounts}
                      color={category?.color ?? null}
                    />
                  );
                })}
              </Card>
            </div>
          ))
        )}
      </section>
    </Page>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0 px-2 text-center">
      <p className={cn("truncate text-lg font-bold tabular-nums", className)}>{value}</p>
      <p className="text-xs font-medium text-muted">{label}</p>
    </div>
  );
}
