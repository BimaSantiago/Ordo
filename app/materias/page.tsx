import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { createCategory } from "./actions";
import { CategoryItem } from "./category-item";

export default async function MateriasPage() {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("schedule_categories")
    .select("id, name, color, type, archived")
    .order("archived", { ascending: true })
    .order("created_at", { ascending: true });

  const categories = data ?? [];
  const active = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-4 pb-24">
      <AppNav current="/materias" />

      <div>
        <h1 className="text-xl font-semibold">Materias</h1>
        <p className="text-sm text-slate-500">
          Escuela y actividades de tu día a día (entrenar, estudiar, jugar...).
        </p>
      </div>

      <section className="space-y-2">
        {active.map((category) => (
          <CategoryItem key={category.id} {...category} />
        ))}
        {active.length === 0 && (
          <p className="text-sm text-slate-400">Aún no tienes materias.</p>
        )}
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 p-3">
        <h2 className="text-sm font-medium text-slate-500">Nueva materia</h2>
        <form action={createCategory} className="flex flex-col gap-2">
          <input
            name="name"
            placeholder="Nombre (p. ej. Cálculo, Entrenamiento)"
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
          />
          <div className="flex gap-2">
            <select
              name="type"
              defaultValue="actividad"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
            >
              <option value="escuela">Escuela</option>
              <option value="actividad">Actividad</option>
            </select>
            <input
              name="color"
              type="color"
              defaultValue="#64748b"
              className="h-11 w-14 rounded-lg border border-slate-300"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-base font-medium text-white"
          >
            Agregar
          </button>
        </form>
      </section>

      {archived.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-slate-500">Archivadas</h2>
          {archived.map((category) => (
            <CategoryItem key={category.id} {...category} />
          ))}
        </section>
      )}
    </main>
  );
}
