import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { createRoutine } from "./actions";
import { RoutineItem } from "./routine-item";

export default async function RutinasPage() {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("routines")
    .select("id, name")
    .order("created_at", { ascending: true });

  const routines = data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-4 pb-24">
      <AppNav current="/gimnasio" />

      <div>
        <h1 className="text-xl font-semibold">Rutinas</h1>
        <p className="text-sm text-slate-500">Plantillas para iniciar un entrenamiento.</p>
      </div>

      <section className="space-y-2">
        {routines.map((routine) => (
          <RoutineItem key={routine.id} {...routine} />
        ))}
        {routines.length === 0 && (
          <p className="text-sm text-slate-400">Aún no tienes rutinas.</p>
        )}
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 p-3">
        <h2 className="text-sm font-medium text-slate-500">Nueva rutina</h2>
        <form action={createRoutine} className="flex gap-2">
          <input
            name="name"
            placeholder="Nombre (p. ej. Push day)"
            required
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-base font-medium text-white"
          >
            Crear
          </button>
        </form>
      </section>
    </main>
  );
}
