import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Plus } from "lucide-react";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { EQUIPMENT_OPTIONS, EXERCISE_INFO_COLUMNS, MUSCLE_GROUP_OPTIONS, type ExerciseInfo } from "@/lib/exercises";
import { createCustomExercise } from "./actions";
import { ExerciseLibrary } from "./exercise-library";

export default async function EjerciciosPage() {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("exercises")
    .select(EXERCISE_INFO_COLUMNS)
    .order("is_custom", { ascending: false })
    .order("name", { ascending: true })
    .returns<ExerciseInfo[]>();

  const exercises = data ?? [];

  return (
    <Page>
      <PageHeader
        title="Ejercicios"
        subtitle={`Biblioteca de ${exercises.length} ejercicios y los tuyos`}
        backHref="/gimnasio"
        backLabel="Gimnasio"
      />

      <details className="rounded-2xl border border-line bg-surface p-3">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-primary">
          <Plus size={18} aria-hidden />
          Agregar ejercicio personalizado
        </summary>
        <form action={createCustomExercise} className="mt-3 flex flex-col gap-2">
          <input
            name="name"
            placeholder="Nombre del ejercicio"
            required
            className="rounded-lg border border-line px-3 py-2 text-base outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <select
              name="primary_muscle_group"
              defaultValue=""
              className="flex-1 rounded-lg border border-line px-2 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Grupo muscular</option>
              {MUSCLE_GROUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              name="equipment"
              defaultValue=""
              className="flex-1 rounded-lg border border-line px-2 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Equipo</option>
              {EQUIPMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-base font-medium text-on-primary"
          >
            Agregar
          </button>
        </form>
      </details>

      <ExerciseLibrary exercises={exercises} />
    </Page>
  );
}
