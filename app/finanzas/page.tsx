import Link from "next/link";
import { BarChart3, CalendarRange, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { QuickAddButton } from "@/components/quick-add/quick-add-button";
import { MonthlyChart } from "@/components/finance/monthly-chart";
import { WeekDaysChart } from "@/components/finance/week-days-chart";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { loadAccounts, loadBudgets, loadCategories, loadTransactions } from "@/lib/finance/load";
import { formatMoney } from "@/lib/finance/money";
import {
  addMonths,
  dailyTotals,
  formatDateRange,
  formatMonth,
  isValidMonth,
  monthOf,
  monthlyTotals,
  monthRange,
  summarize,
  summarizeRange,
  weeksOfMonth,
} from "@/lib/finance/summary";
import { resolveWeekStart, weekRange } from "@/lib/review/week";
import { addDaysToLocalDate, getLocalDateString, getLocalWeekStart } from "@/lib/date";
import { cn } from "@/lib/cn";
import { AccountsStrip, BudgetSection, CategoryBreakdown, MovementsList, SummaryCard } from "./sections";

type SearchParams = { vista?: string; mes?: string; semana?: string };

export default async function FinanzasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const today = getLocalDateString();
  // La semana es la vista principal; `?mes=` solo (enlaces anteriores) abre la vista mensual.
  const view = params.vista === "mes" || (params.vista !== "semana" && isValidMonth(params.mes)) ? "mes" : "semana";

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) await ensureFinanceDefaults(supabase, auth.user.id);

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
      {view === "semana" ? (
        <WeekView weekParam={params.semana} today={today} supabase={supabase} />
      ) : (
        <MonthView monthParam={params.mes} today={today} supabase={supabase} />
      )}
    </Page>
  );
}

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function WeekView({ weekParam, today, supabase }: { weekParam?: string; today: string; supabase: Supabase }) {
  const weekStart = resolveWeekStart(weekParam, today);
  const range = weekRange(weekStart);
  const previous = weekRange(addDaysToLocalDate(weekStart, -7));
  const isCurrent = weekStart === getLocalWeekStart(today);

  const [accounts, categories, bothWeeks] = await Promise.all([
    loadAccounts(supabase),
    loadCategories(supabase),
    loadTransactions(supabase, previous.from, range.to),
  ]);
  const transactions = bothWeeks.filter((t) => t.localDate >= range.from);
  const summary = summarize(transactions);
  const previousSummary = summarizeRange(bothWeeks, previous);
  const days = dailyTotals(transactions, range.from, range.to);
  const elapsedDays = isCurrent ? days.filter((d) => d.localDate <= today).length : 7;
  const monthForToggle = monthOf(range.to <= today ? range.to : today);

  return (
    <>
      <ViewToggle
        view="semana"
        weekHref="/finanzas?vista=semana"
        monthHref={`/finanzas?vista=mes&mes=${monthForToggle}`}
      />
      <PeriodNav
        label={isCurrent ? `Esta semana · ${formatDateRange(range.from, range.to)}` : formatDateRange(range.from, range.to)}
        previousHref={`/finanzas?vista=semana&semana=${previous.from}`}
        previousLabel="Semana anterior"
        nextHref={isCurrent ? null : `/finanzas?vista=semana&semana=${addDaysToLocalDate(weekStart, 7)}`}
        nextLabel="Semana siguiente"
      />

      <SummaryCard summary={summary} />
      <WeekComparison
        expense={summary.expense}
        previousExpense={previousSummary.expense}
        elapsedDays={elapsedDays}
        isCurrent={isCurrent}
      />

      <section className="space-y-2">
        <SectionTitle icon={<BarChart3 size={16} aria-hidden />}>Gasto por día</SectionTitle>
        <Card className="px-3 pt-3 pb-2">
          <WeekDaysChart days={days} today={today} />
        </Card>
      </section>

      <AccountsStrip accounts={accounts} />
      <CategoryBreakdown transactions={transactions} categories={categories} />
      <MovementsList
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        today={today}
        emptyText="Sin movimientos esta semana. Registra uno con el botón +."
      />
    </>
  );
}

function WeekComparison({
  expense,
  previousExpense,
  elapsedDays,
  isCurrent,
}: {
  expense: number;
  previousExpense: number;
  elapsedDays: number;
  isCurrent: boolean;
}) {
  if (expense === 0 && previousExpense === 0) return null;
  const diff = expense - previousExpense;
  const average = elapsedDays > 0 ? expense / elapsedDays : 0;
  const comparison =
    previousExpense === 0
      ? "La semana pasada no registraste gastos."
      : Math.abs(diff) < 1
        ? "Gastaste lo mismo que la semana pasada."
        : `${isCurrent ? "Llevas" : "Gastaste"} ${formatMoney(Math.abs(diff), { round: true })} ${diff < 0 ? "menos" : "más"} que la semana pasada.`;

  return (
    <p className="-mt-2 px-1 text-sm text-muted">
      <span className={cn(previousExpense > 0 && diff >= 1 && "font-semibold text-fg")}>{comparison}</span> Promedio de{" "}
      <span className="font-semibold tabular-nums text-fg">{formatMoney(average, { round: true })}</span> al día
      {isCurrent ? ` en ${elapsedDays} ${elapsedDays === 1 ? "día" : "días"}.` : "."}
    </p>
  );
}

async function MonthView({ monthParam, today, supabase }: { monthParam?: string; today: string; supabase: Supabase }) {
  const currentMonth = monthOf(today);
  const month = isValidMonth(monthParam) && monthParam <= currentMonth ? monthParam : currentMonth;
  const { from, to } = monthRange(month);
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
  const weeks = weeksOfMonth(month)
    .filter((week) => week.from <= today)
    .map((week) => ({ ...week, ...summarizeRange(transactions, week) }))
    .reverse();
  const weekForToggle = month === currentMonth ? null : resolveWeekStart(to, today);

  return (
    <>
      <ViewToggle
        view="mes"
        weekHref={weekForToggle ? `/finanzas?vista=semana&semana=${weekForToggle}` : "/finanzas?vista=semana"}
        monthHref={`/finanzas?vista=mes&mes=${month}`}
      />
      <PeriodNav
        label={formatMonth(month)}
        previousHref={`/finanzas?vista=mes&mes=${addMonths(month, -1)}`}
        previousLabel="Mes anterior"
        nextHref={month < currentMonth ? `/finanzas?vista=mes&mes=${addMonths(month, 1)}` : null}
        nextLabel="Mes siguiente"
      />

      <SummaryCard summary={summarize(transactions)} />

      {weeks.length > 0 && (
        <section className="space-y-2">
          <SectionTitle icon={<CalendarRange size={16} aria-hidden />}>Por semana</SectionTitle>
          <Card className="divide-y divide-line">
            {weeks.map((week) => (
              <Link
                key={week.weekStart}
                href={`/finanzas?vista=semana&semana=${week.weekStart}`}
                className="pressable flex min-h-14 items-center gap-3 px-3 py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{formatDateRange(week.from, week.to)}</span>
                  <span className="block text-xs text-muted tabular-nums">
                    Gastos {formatMoney(week.expense, { round: true })}
                    {week.income > 0 && ` · Ingresos ${formatMoney(week.income, { round: true })}`}
                  </span>
                </span>
                <span className={cn("font-bold tabular-nums", week.net < 0 && "text-danger")}>
                  {formatMoney(week.net, { round: true, signed: true })}
                </span>
                <ChevronRight size={18} className="text-muted" aria-hidden />
              </Link>
            ))}
          </Card>
        </section>
      )}

      <AccountsStrip accounts={accounts} />
      <BudgetSection categories={categories} budgets={budgets} transactions={transactions} />
      <CategoryBreakdown transactions={transactions} categories={categories} />

      <section className="space-y-2">
        <SectionTitle icon={<BarChart3 size={16} aria-hidden />}>Últimos 6 meses</SectionTitle>
        <Card className="px-2 py-3">
          <MonthlyChart data={trend} />
        </Card>
      </section>

      <MovementsList
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        today={today}
        emptyText="Sin movimientos en este mes. Registra uno con el botón +."
      />
    </>
  );
}

function ViewToggle({ view, weekHref, monthHref }: { view: "semana" | "mes"; weekHref: string; monthHref: string }) {
  const item = (active: boolean) =>
    cn(
      "pressable flex min-h-10 flex-1 items-center justify-center rounded-lg text-sm font-semibold",
      active ? "bg-surface text-fg shadow-sm" : "text-muted"
    );
  return (
    <nav aria-label="Periodo" className="flex gap-1 rounded-xl bg-surface-2 p-1">
      <Link href={weekHref} aria-current={view === "semana" ? "page" : undefined} className={item(view === "semana")}>
        Semana
      </Link>
      <Link href={monthHref} aria-current={view === "mes" ? "page" : undefined} className={item(view === "mes")}>
        Mes
      </Link>
    </nav>
  );
}

function PeriodNav({
  label,
  previousHref,
  previousLabel,
  nextHref,
  nextLabel,
}: {
  label: string;
  previousHref: string;
  previousLabel: string;
  nextHref: string | null;
  nextLabel: string;
}) {
  const button = "pressable flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface";
  return (
    <nav aria-label={previousLabel.includes("Semana") ? "Semana" : "Mes"} className="flex items-center justify-between">
      <Link href={previousHref} aria-label={previousLabel} className={button}>
        <ChevronLeft size={20} aria-hidden />
      </Link>
      <p className="font-semibold first-letter:uppercase">{label}</p>
      {nextHref ? (
        <Link href={nextHref} aria-label={nextLabel} className={button}>
          <ChevronRight size={20} aria-hidden />
        </Link>
      ) : (
        <span className="h-11 w-11" aria-hidden />
      )}
    </nav>
  );
}
