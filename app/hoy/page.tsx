import Link from "next/link";
import { CalendarClock, CheckSquare, Clock, Flame, Plus, Scale } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDisplayDate, getLocalDateString, getLocalDayOfWeek } from "@/lib/date";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { TaskRow, type TaskRowData } from "@/components/task-row";
import { QuickAddButton } from "@/components/quick-add/quick-add-button";
import { HabitItem } from "./habit-item";

type Category = { name: string; color: string } | { name: string; color: string }[] | null;

function one(category: Category) {
  return Array.isArray(category) ? (category[0] ?? null) : category;
}

type TimelineItem = {
  key: string;
  start: string;
  end: string | null;
  title: string;
  subtitle: string | null;
  color: string;
  kind: "bloque" | "actividad";
  completed: boolean;
};

export default async function HoyPage() {
  const supabase = await createSupabaseServerClient();
  const localDate = getLocalDateString();
  const dayOfWeek = getLocalDayOfWeek(localDate);

  const [tasksRes, habitsRes, habitLogsRes, weightRes, blocksRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, due_date, category_id, start_time, end_time, remind_at, schedule_categories(name, color)")
      .eq("due_date", localDate)
      .order("start_time", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase.from("habits").select("id, name").eq("archived", false).order("created_at", { ascending: true }),
    supabase.from("habit_logs").select("habit_id").eq("local_date", localDate),
    supabase.from("body_weight_logs").select("weight_kg").eq("local_date", localDate).maybeSingle(),
    supabase
      .from("schedule_blocks")
      .select("id, start_time, end_time, notes, schedule_categories(name, color)")
      .eq("day_of_week", dayOfWeek)
      .order("start_time", { ascending: true }),
  ]);

  const tasks: TaskRowData[] = (tasksRes.data ?? []).map((row) => {
    const category = one(row.schedule_categories as Category);
    return {
      id: row.id,
      title: row.title,
      dueDate: row.due_date,
      categoryId: row.category_id,
      startTime: row.start_time,
      endTime: row.end_time,
      remindAt: row.remind_at,
      completed: row.status === "completada",
      categoryName: category?.name ?? null,
      categoryColor: category?.color ?? null,
    };
  });
  const habits = habitsRes.data ?? [];
  const doneHabitIds = new Set((habitLogsRes.data ?? []).map((log) => log.habit_id));
  const currentWeight = weightRes.data?.weight_kg as number | undefined;

  const timeline: TimelineItem[] = [
    ...(blocksRes.data ?? []).map((block) => {
      const category = one(block.schedule_categories as Category);
      return {
        key: `b-${block.id}`,
        start: block.start_time,
        end: block.end_time,
        title: category?.name ?? "Sin materia",
        subtitle: block.notes,
        color: category?.color ?? "#64748b",
        kind: "bloque" as const,
        completed: false,
      };
    }),
    ...tasks
      .filter((t) => t.startTime)
      .map((t) => ({
        key: `t-${t.id}`,
        start: t.startTime!,
        end: t.endTime,
        title: t.title,
        subtitle: t.categoryName,
        color: t.categoryColor ?? "var(--accent)",
        kind: "actividad" as const,
        completed: t.completed,
      })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const habitsDone = habits.filter((h) => doneHabitIds.has(h.id)).length;

  return (
    <Page>
      <PageHeader title="Hoy" subtitle={formatDisplayDate(localDate)} />

      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<CheckSquare size={16} aria-hidden />} value={pendingCount} label="pendientes" />
        <Stat icon={<Flame size={16} aria-hidden />} value={`${habitsDone}/${habits.length}`} label="hábitos" />
        <QuickAddButton
          prefill={{ tab: "peso" }}
          aria-label={currentWeight ? `Peso de hoy ${currentWeight} kg, actualizar` : "Registrar peso de hoy"}
          className="flex h-auto min-h-[4.5rem] flex-col items-start justify-center gap-0.5 rounded-2xl border border-line bg-surface px-3 text-left text-fg"
        >
          <span className="flex items-center gap-1.5 text-muted">
            <Scale size={16} aria-hidden />
          </span>
          <span className="text-lg leading-tight font-bold">{currentWeight ? `${currentWeight}` : "—"}</span>
          <span className="text-xs font-medium text-muted">{currentWeight ? "kg hoy" : "registrar"}</span>
        </QuickAddButton>
      </div>

      <section className="space-y-2">
        <SectionTitle
          icon={<CalendarClock size={16} aria-hidden />}
          action={
            <Link href="/horario" className="pressable inline-flex min-h-11 items-center px-2 text-sm font-semibold text-primary">
              Ver semana
            </Link>
          }
        >
          Tu día
        </SectionTitle>
        {timeline.length === 0 ? (
          <Card className="px-4 py-5 text-center text-sm text-muted">Sin clases ni actividades con hora hoy.</Card>
        ) : (
          <Card className="divide-y divide-line">
            {timeline.map((item) => (
              <div key={item.key} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">{item.start.slice(0, 5)}</span>
                <span aria-hidden className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium ${item.completed ? "text-muted line-through" : ""}`}>{item.title}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted">
                    {item.kind === "actividad" && <Clock size={12} aria-hidden />}
                    {item.end ? `hasta ${item.end.slice(0, 5)}` : "actividad"}
                    {item.subtitle && ` · ${item.subtitle}`}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section className="space-y-2">
        <SectionTitle
          icon={<CheckSquare size={16} aria-hidden />}
          action={
            <QuickAddButton prefill={{ tab: "tarea", dueDate: localDate }}>
              <Plus size={16} aria-hidden />
              Tarea
            </QuickAddButton>
          }
        >
          Tareas
        </SectionTitle>
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
          {tasks.length === 0 && (
            <Card className="px-4 py-5 text-center text-sm text-muted">Sin tareas para hoy. Agrega una con el botón +.</Card>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <SectionTitle
          icon={<Flame size={16} aria-hidden />}
          action={
            <QuickAddButton prefill={{ tab: "habito" }}>
              <Plus size={16} aria-hidden />
              Hábito
            </QuickAddButton>
          }
        >
          Hábitos
        </SectionTitle>
        <div className="space-y-2">
          {habits.map((habit) => (
            <HabitItem key={habit.id} id={habit.id} name={habit.name} doneToday={doneHabitIds.has(habit.id)} />
          ))}
          {habits.length === 0 && (
            <Card className="px-4 py-5 text-center text-sm text-muted">Aún no tienes hábitos.</Card>
          )}
        </div>
      </section>
    </Page>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <Card className="flex min-h-[4.5rem] flex-col justify-center gap-0.5 px-3">
      <span className="text-muted">{icon}</span>
      <span className="text-lg leading-tight font-bold">{value}</span>
      <span className="text-xs font-medium text-muted">{label}</span>
    </Card>
  );
}
