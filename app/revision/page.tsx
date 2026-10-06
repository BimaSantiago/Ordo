import Link from "next/link";
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  FolderKanban,
  Lightbulb,
  NotebookPen,
  Scale,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addDaysToLocalDate, formatShortDate, getLocalDateString, getLocalWeekStart, localDateTimeToUtcIso } from "@/lib/date";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { TaskRow, type TaskRowData } from "@/components/task-row";
import { loadHabits } from "@/lib/habits/load";
import { loadTransactions } from "@/lib/finance/load";
import { summarize } from "@/lib/finance/summary";
import { formatMoney } from "@/lib/finance/money";
import { summarizeWorkouts } from "@/lib/gimnasio/progress";
import { mapWorkoutRow, WORKOUT_WITH_SETS_SELECT } from "@/lib/gimnasio/workout-rows";
import { getSettings } from "@/lib/settings-server";
import { formatWeight } from "@/lib/units";
import { habitStats, resolveWeekStart, taskStats, weekRange, weeklyWeightChange } from "@/lib/review/week";
import { cn } from "@/lib/cn";
import { ReviewForm } from "./review-form";

type Category = { name: string; color: string } | { name: string; color: string }[] | null;
const one = (c: Category) => (Array.isArray(c) ? (c[0] ?? null) : c);

const percent = (rate: number) => `${Math.round(rate * 100)}%`;

export default async function RevisionPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { weightUnit } = await getSettings();
  const today = getLocalDateString();
  const weekStart = resolveWeekStart(semana, today);
  const { from, to } = weekRange(weekStart);
  const isCurrentWeek = weekStart === getLocalWeekStart(today);
  // Límites UTC de la semana local, para columnas timestamptz.
  const fromUtc = localDateTimeToUtcIso(from, "00:00");
  const toUtc = localDateTimeToUtcIso(addDaysToLocalDate(to, 1), "00:00");

  const [tasksRes, habits, workoutsRes, weightRes, transactions, projectsRes, ideasRes, reviewRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, due_date, completed_at, category_id, start_time, end_time, remind_at, schedule_categories(name, color)")
      .or(`status.eq.pendiente,and(completed_at.gte."${fromUtc}",completed_at.lt."${toUtc}")`)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(1000),
    loadHabits(supabase, { sinceDate: from, includeArchived: false }),
    supabase
      .from("workouts")
      .select(WORKOUT_WITH_SETS_SELECT)
      .not("finished_at", "is", null)
      .gte("started_at", fromUtc)
      .lt("started_at", toUtc),
    // Dos semanas antes para que la media móvil tenga contra qué comparar.
    supabase
      .from("body_weight_logs")
      .select("local_date, weight_kg")
      .gte("local_date", addDaysToLocalDate(from, -14))
      .lte("local_date", to),
    loadTransactions(supabase, from, to),
    supabase.from("projects").select("id, name, next_steps").eq("status", "activo").order("updated_at", { ascending: false }),
    supabase.from("ideas").select("id", { count: "exact", head: true }).is("project_id", null),
    supabase.from("weekly_reviews").select("wins, lessons, next_focus").eq("week_start", weekStart).maybeSingle(),
  ]);

  const taskRows = (tasksRes.data ?? []).map((row) => ({
    row,
    completedDate: row.completed_at ? getLocalDateString(new Date(row.completed_at)) : null,
  }));
  const tasks = taskStats(
    taskRows.map(({ row, completedDate }) => ({ completed: row.status === "completada", dueDate: row.due_date, completedDate })),
    weekStart
  );
  const pendingTasks: TaskRowData[] = taskRows
    .filter(({ row }) => row.status !== "completada" && row.due_date && row.due_date <= to)
    .map(({ row }) => {
      const category = one(row.schedule_categories as Category);
      return {
        id: row.id,
        title: row.title,
        dueDate: row.due_date,
        categoryId: row.category_id,
        startTime: row.start_time,
        endTime: row.end_time,
        remindAt: row.remind_at,
        completed: false,
        categoryName: category?.name ?? null,
        categoryColor: category?.color ?? null,
      };
    });

  const habitSummary = habitStats(habits, weekStart, today);
  const gym = summarizeWorkouts((workoutsRes.data ?? []).map(mapWorkoutRow));
  const weight = weeklyWeightChange(
    (weightRes.data ?? []).map((row) => ({ localDate: row.local_date, value: Number(row.weight_kg) })),
    weekStart
  );
  const money = summarize(transactions);
  const projects = projectsRes.data ?? [];
  const projectsWithoutStep = projects.filter((p) => !p.next_steps?.trim()).length;
  const review = reviewRes.data
    ? { wins: reviewRes.data.wins ?? "", lessons: reviewRes.data.lessons ?? "", nextFocus: reviewRes.data.next_focus ?? "" }
    : null;

  return (
    <Page>
      <PageHeader title="Revisión semanal" subtitle="Mira la semana y decide la siguiente" backHref="/mas" backLabel="Más" />

      <nav className="flex items-center justify-between gap-2" aria-label="Semana">
        <Link
          href={`/revision?semana=${addDaysToLocalDate(weekStart, -7)}`}
          aria-label="Semana anterior"
          className="pressable flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface"
        >
          <ChevronLeft size={20} aria-hidden />
        </Link>
        <p className="text-center font-semibold">
          {formatShortDate(from)} – {formatShortDate(to)}
          {isCurrentWeek && <span className="block text-xs font-medium text-muted">Esta semana</span>}
        </p>
        {isCurrentWeek ? (
          <span className="h-11 w-11" aria-hidden />
        ) : (
          <Link
            href={`/revision?semana=${addDaysToLocalDate(weekStart, 7)}`}
            aria-label="Semana siguiente"
            className="pressable flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface"
          >
            <ChevronRight size={20} aria-hidden />
          </Link>
        )}
      </nav>

      <div className="grid grid-cols-2 gap-2">
        <StatLink href="/hoy" icon={<CheckSquare size={16} aria-hidden />} value={tasks.completed} label="tareas completadas" />
        <StatLink
          href="/habitos"
          icon={<Flame size={16} aria-hidden />}
          value={habitSummary.average === null ? "—" : percent(habitSummary.average)}
          label="hábitos cumplidos"
        />
        <StatLink
          href="/gimnasio/progreso"
          icon={<Dumbbell size={16} aria-hidden />}
          value={gym.sessions}
          label={gym.sessions > 0 ? `entrenos · ${formatWeight(gym.volumeKg, weightUnit, { decimals: 0 })}` : "entrenamientos"}
        />
        <StatLink
          href="/peso"
          icon={<Scale size={16} aria-hidden />}
          value={weight ? formatWeight(weight.latest, weightUnit) : "—"}
          label={
            weight?.change == null
              ? "tendencia de peso"
              : `${weight.change > 0 ? "+" : ""}${formatWeight(weight.change, weightUnit)} en la semana`
          }
        />
        <StatLink
          href={`/finanzas?mes=${to.slice(0, 7)}`}
          icon={<Wallet size={16} aria-hidden />}
          value={formatMoney(money.expense, { round: true })}
          label={`gastado · ingresos ${formatMoney(money.income, { round: true })}`}
          className="col-span-2"
        />
      </div>

      {habitSummary.rows.length > 0 && (
        <section className="space-y-2">
          <SectionTitle icon={<Flame size={16} aria-hidden />}>Hábitos de la semana</SectionTitle>
          <Card className="divide-y divide-line">
            {habitSummary.rows.map((row) => (
              <div key={row.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
                <span className="h-2 w-20 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <span className="block h-full rounded-full bg-primary" style={{ width: percent(row.rate) }} />
                </span>
                <span className="w-10 text-right text-sm font-semibold tabular-nums">{percent(row.rate)}</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section className="space-y-2">
        <SectionTitle icon={<CheckSquare size={16} aria-hidden />}>
          Pendientes al cierre ({pendingTasks.length})
          {tasks.nextWeek > 0 && <span className="font-normal"> · {tasks.nextWeek} para la siguiente</span>}
        </SectionTitle>
        {pendingTasks.length === 0 ? (
          <Card className="px-4 py-4 text-sm text-muted">Nada vencido. Buen trabajo.</Card>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted">Complétalas, cámbiales la fecha o bórralas para empezar limpio.</p>
            {pendingTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <SectionTitle
          icon={<FolderKanban size={16} aria-hidden />}
          action={
            <Link href="/notas?tab=ideas" className="pressable inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-primary">
              <Lightbulb size={14} aria-hidden />
              {ideasRes.count ?? 0} {ideasRes.count === 1 ? "idea" : "ideas"}
            </Link>
          }
        >
          Proyectos activos ({projects.length})
        </SectionTitle>
        {projects.length === 0 ? (
          <Card className="px-4 py-4 text-sm text-muted">Sin proyectos activos.</Card>
        ) : (
          <Card className="divide-y divide-line">
            {projects.map((project) => {
              const nextStep = project.next_steps?.split("\n").find((line: string) => line.trim());
              return (
                <Link key={project.id} href={`/proyectos/${project.id}`} className="pressable flex min-h-14 items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{project.name}</span>
                    <span className={cn("block truncate text-sm", nextStep ? "text-muted" : "text-danger")}>
                      {nextStep ? `Sigue: ${nextStep.trim()}` : "Define el próximo paso"}
                    </span>
                  </span>
                  <ChevronRight size={18} className="text-muted" aria-hidden />
                </Link>
              );
            })}
          </Card>
        )}
        {projectsWithoutStep > 0 && (
          <p className="text-sm text-muted">
            {projectsWithoutStep === 1 ? "1 proyecto no tiene" : `${projectsWithoutStep} proyectos no tienen`} próximo paso.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <SectionTitle icon={<NotebookPen size={16} aria-hidden />}>Reflexión</SectionTitle>
        <ReviewForm key={weekStart} weekStart={weekStart} review={review} />
      </section>
    </Page>
  );
}

function StatLink({
  href,
  icon,
  value,
  label,
  className,
}: {
  href: string;
  icon: ReactNode;
  value: string | number;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("pressable flex min-h-[4.5rem] flex-col justify-center gap-0.5 rounded-2xl border border-line bg-surface px-3 py-2", className)}
    >
      <span className="text-muted">{icon}</span>
      <span className="text-lg leading-tight font-bold tabular-nums">{value}</span>
      <span className="truncate text-xs font-medium text-muted">{label}</span>
    </Link>
  );
}
