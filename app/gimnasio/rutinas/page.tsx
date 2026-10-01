import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
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
    <Page>
      <PageHeader
        title="Rutinas"
        subtitle="Plantillas para iniciar un entrenamiento"
        backHref="/gimnasio"
        backLabel="Gimnasio"
      />

      <section className="space-y-2">
        {routines.map((routine) => (
          <RoutineItem key={routine.id} {...routine} />
        ))}
        {routines.length === 0 && (
          <p className="text-sm text-muted">Aún no tienes rutinas.</p>
        )}
      </section>

      <section className="space-y-2 rounded-lg border border-line p-3">
        <h2 className="text-sm font-medium text-muted">Nueva rutina</h2>
        <form action={createRoutine} className="flex gap-2">
          <input
            name="name"
            placeholder="Nombre (p. ej. Push day)"
            required
            className="flex-1 rounded-lg border border-line px-3 py-2 text-base outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-base font-medium text-on-primary"
          >
            Crear
          </button>
        </form>
      </section>
    </Page>
  );
}
