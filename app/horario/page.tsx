import Link from "next/link";
import { Tags } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { addDaysToLocalDate, formatShortDate, getLocalDateString, getLocalWeekStart } from "@/lib/date";
import { buildWeekGrid, type GridBlock, type GridTask } from "@/lib/schedule/week-grid";
import { WeekGridView } from "./week-grid-view";

type Category = { name: string; color: string } | { name: string; color: string }[] | null;

function one(category: Category) {
  return Array.isArray(category) ? (category[0] ?? null) : category;
}

export default async function HorarioPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  const today = getLocalDateString();
  const weekStart = getLocalWeekStart(semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) ? semana : today);
  const weekEnd = addDaysToLocalDate(weekStart, 6);

  const supabase = await createSupabaseServerClient();
  const [categoriesRes, blocksRes, tasksRes] = await Promise.all([
    supabase.from("schedule_categories").select("id, name, color").eq("archived", false).order("name"),
    supabase
      .from("schedule_blocks")
      .select("id, category_id, day_of_week, start_time, end_time, notes, schedule_categories(name, color)"),
    supabase
      .from("tasks")
      .select("id, title, due_date, category_id, start_time, end_time, status, remind_at, schedule_categories(name, color)")
      .gte("due_date", weekStart)
      .lte("due_date", weekEnd)
      .order("created_at"),
  ]);

  const blocks: GridBlock[] = (blocksRes.data ?? []).map((row) => {
    const category = one(row.schedule_categories as Category);
    return {
      id: row.id,
      categoryId: row.category_id,
      categoryName: category?.name ?? "Sin materia",
      categoryColor: category?.color ?? "#64748b",
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      notes: row.notes,
    };
  });

  const tasks: GridTask[] = (tasksRes.data ?? []).map((row) => {
    const category = one(row.schedule_categories as Category);
    return {
      id: row.id,
      title: row.title,
      dueDate: row.due_date,
      categoryId: row.category_id,
      categoryName: category?.name ?? null,
      categoryColor: category?.color ?? null,
      startTime: row.start_time,
      endTime: row.end_time,
      completed: row.status === "completada",
      remindAt: row.remind_at,
    };
  });

  const grid = buildWeekGrid({ weekStart, blocks, tasks });

  return (
    <Page wide>
      <PageHeader
        title="Semana"
        subtitle="Tu horario fijo y lo que tienes que hacer"
        action={
          <Link
            href="/materias"
            className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-semibold"
          >
            <Tags size={16} aria-hidden />
            Materias
          </Link>
        }
      />
      <WeekGridView
        grid={grid}
        categories={categoriesRes.data ?? []}
        today={today}
        weekLabel={`${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)}`}
        prevWeek={addDaysToLocalDate(weekStart, -7)}
        nextWeek={addDaysToLocalDate(weekStart, 7)}
        isCurrentWeek={weekStart === getLocalWeekStart(today)}
      />
    </Page>
  );
}
