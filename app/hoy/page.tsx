import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocalDateString, getLocalDayOfWeek, formatDisplayDate } from "@/lib/date";
import { AppNav } from "@/components/app-nav";
import { createTask, createHabit, saveWeight, saveQuickNote } from "./actions";
import { TaskItem } from "./task-item";
import { HabitItem } from "./habit-item";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  schedule_categories: { name: string; color: string } | null;
};

type BlockRow = {
  id: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  schedule_categories: { name: string; color: string } | null;
};

export default async function HoyPage() {
  const supabase = await createSupabaseServerClient();
  const localDate = getLocalDateString();
  const dayOfWeek = getLocalDayOfWeek(localDate);

  const [tasksRes, habitsRes, habitLogsRes, weightRes, categoriesRes, blocksRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, schedule_categories(name, color)")
      .eq("due_date", localDate)
      .order("created_at", { ascending: true })
      .returns<TaskRow[]>(),
    supabase
      .from("habits")
      .select("id, name")
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase.from("habit_logs").select("habit_id").eq("local_date", localDate),
    supabase
      .from("body_weight_logs")
      .select("weight_kg")
      .eq("local_date", localDate)
      .maybeSingle(),
    supabase
      .from("schedule_categories")
      .select("id, name")
      .eq("archived", false)
      .order("name", { ascending: true }),
    supabase
      .from("schedule_blocks")
      .select("id, start_time, end_time, notes, schedule_categories(name, color)")
      .eq("day_of_week", dayOfWeek)
      .order("start_time", { ascending: true })
      .returns<BlockRow[]>(),
  ]);

  const tasks = tasksRes.data ?? [];
  const habits = habitsRes.data ?? [];
  const doneHabitIds = new Set((habitLogsRes.data ?? []).map((log) => log.habit_id));
  const currentWeight = weightRes.data?.weight_kg;
  const categories = categoriesRes.data ?? [];
  const todayBlocks = blocksRes.data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-4 pb-24">
      <AppNav current="/hoy" />
      <div>
        <h1 className="text-xl font-semibold">Hoy</h1>
        <p className="text-sm capitalize text-slate-500">{formatDisplayDate(localDate)}</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-500">Tu horario de hoy</h2>
        <div className="space-y-2">
          {todayBlocks.map((block) => (
            <div key={block.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: block.schedule_categories?.color ?? "#64748b" }}
                aria-hidden
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{block.schedule_categories?.name ?? "Sin materia"}</p>
                <p className="text-xs text-slate-500">
                  {block.start_time.slice(0, 5)}–{block.end_time.slice(0, 5)}
                  {block.notes ? ` · ${block.notes}` : ""}
                </p>
              </div>
            </div>
          ))}
          {todayBlocks.length === 0 && (
            <p className="text-sm text-slate-400">Sin bloques hoy.</p>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-500">Tareas</h2>
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              id={task.id}
              title={task.title}
              completed={task.status === "completada"}
              categoryName={task.schedule_categories?.name}
              categoryColor={task.schedule_categories?.color}
            />
          ))}
          {tasks.length === 0 && (
            <p className="text-sm text-slate-400">Sin tareas para hoy.</p>
          )}
        </div>
        <form action={createTask} className="flex flex-wrap gap-2">
          <input
            name="title"
            placeholder="Nueva tarea"
            required
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
          />
          {categories.length > 0 && (
            <select
              name="category_id"
              defaultValue=""
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Sin materia</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-base font-medium text-white"
          >
            +
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-500">Hábitos</h2>
        <div className="space-y-2">
          {habits.map((habit) => (
            <HabitItem
              key={habit.id}
              id={habit.id}
              name={habit.name}
              doneToday={doneHabitIds.has(habit.id)}
            />
          ))}
          {habits.length === 0 && (
            <p className="text-sm text-slate-400">Aún no tienes hábitos.</p>
          )}
        </div>
        <form action={createHabit} className="flex gap-2">
          <input
            name="name"
            placeholder="Nuevo hábito"
            required
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-base font-medium text-white"
          >
            +
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-500">Peso corporal</h2>
        <form action={saveWeight} className="flex gap-2">
          <input
            name="weight"
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder="kg"
            defaultValue={currentWeight ?? ""}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-base font-medium text-white"
          >
            Guardar
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-500">Nota rápida</h2>
        <form action={saveQuickNote} className="flex gap-2">
          <input
            name="body"
            placeholder="Escribe algo..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-base font-medium text-white"
          >
            +
          </button>
        </form>
      </section>
    </main>
  );
}
