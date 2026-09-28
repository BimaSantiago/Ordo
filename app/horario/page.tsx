import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { WEEKDAY_LABELS } from "@/lib/date";
import { createBlock } from "./actions";
import { BlockItem } from "./block-item";

type BlockRow = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  notes: string | null;
  schedule_categories: { name: string; color: string } | null;
};

export default async function HorarioPage() {
  const supabase = await createSupabaseServerClient();

  const [categoriesRes, blocksRes] = await Promise.all([
    supabase
      .from("schedule_categories")
      .select("id, name, color")
      .eq("archived", false)
      .order("name", { ascending: true }),
    supabase
      .from("schedule_blocks")
      .select("id, day_of_week, start_time, end_time, notes, schedule_categories(name, color)")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true })
      .returns<BlockRow[]>(),
  ]);

  const categories = categoriesRes.data ?? [];
  const blocks = blocksRes.data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-4 pb-24">
      <AppNav current="/horario" />

      <div>
        <h1 className="text-xl font-semibold">Horario semanal</h1>
        <p className="text-sm text-slate-500">Se repite cada semana, igual todos los lunes, martes...</p>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-slate-400">
          Primero crea tus materias/actividades en la pantalla{" "}
          <span className="font-medium">Materias</span>.
        </p>
      ) : (
        <section className="space-y-2 rounded-lg border border-slate-200 p-3">
          <h2 className="text-sm font-medium text-slate-500">Nuevo bloque</h2>
          <form action={createBlock} className="flex flex-col gap-2">
            <select
              name="category_id"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              name="day_of_week"
              defaultValue="1"
              className="rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
            >
              {WEEKDAY_LABELS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                name="start_time"
                type="time"
                required
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
              />
              <input
                name="end_time"
                type="time"
                required
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
              />
            </div>
            <input
              name="notes"
              placeholder="Notas (salón, liga...) opcional"
              className="rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-base font-medium text-white"
            >
              Agregar al horario
            </button>
          </form>
        </section>
      )}

      <section className="space-y-4">
        {WEEKDAY_LABELS.map((label, dayIndex) => {
          const dayBlocks = blocks.filter((b) => b.day_of_week === dayIndex);
          return (
            <div key={label} className="space-y-2">
              <h2 className="text-sm font-medium text-slate-500">{label}</h2>
              <div className="space-y-2">
                {dayBlocks.map((block) => (
                  <BlockItem
                    key={block.id}
                    id={block.id}
                    categoryName={block.schedule_categories?.name ?? "Sin materia"}
                    categoryColor={block.schedule_categories?.color ?? "#64748b"}
                    startTime={block.start_time}
                    endTime={block.end_time}
                    notes={block.notes}
                  />
                ))}
                {dayBlocks.length === 0 && (
                  <p className="text-sm text-slate-400">Sin bloques.</p>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
