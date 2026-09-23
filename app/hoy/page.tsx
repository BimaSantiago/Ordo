import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocalDateString, formatDisplayDate } from "@/lib/date";
import { createTask, createHabit, saveWeight, saveQuickNote, signOut } from "./actions";
import { TaskItem } from "./task-item";
import { HabitItem } from "./habit-item";

export default async function HoyPage() {
  const supabase = await createSupabaseServerClient();
  const localDate = getLocalDateString();

  const [tasksRes, habitsRes, habitLogsRes, weightRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status")
      .eq("due_date", localDate)
      .order("created_at", { ascending: true }),
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
  ]);

  const tasks = tasksRes.data ?? [];
  const habits = habitsRes.data ?? [];
  const doneHabitIds = new Set((habitLogsRes.data ?? []).map((log) => log.habit_id));
  const currentWeight = weightRes.data?.weight_kg;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-4 pb-24">
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-semibold">Hoy</h1>
          <p className="text-sm capitalize text-slate-500">{formatDisplayDate(localDate)}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm text-slate-400">
            Salir
          </button>
        </form>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-500">Tareas</h2>
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              id={task.id}
              title={task.title}
              completed={task.status === "completada"}
            />
          ))}
          {tasks.length === 0 && (
            <p className="text-sm text-slate-400">Sin tareas para hoy.</p>
          )}
        </div>
        <form action={createTask} className="flex gap-2">
          <input
            name="title"
            placeholder="Nueva tarea"
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
