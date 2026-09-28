import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { EQUIPMENT_OPTIONS, MUSCLE_GROUP_OPTIONS } from "@/lib/exercises";
import { createCustomExercise } from "./actions";
import { ExerciseLibrary } from "./exercise-library";

export default async function EjerciciosPage() {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("exercises")
    .select("id, name, primary_muscle_group, equipment, is_custom")
    .order("is_custom", { ascending: false })
    .order("name", { ascending: true });

  const exercises = data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-4 pb-24">
      <AppNav current="/gimnasio" />

      <div>
        <h1 className="text-xl font-semibold">Ejercicios</h1>
        <p className="text-sm text-slate-500">
          Biblioteca de {exercises.length} ejercicios y los tuyos personalizados.
        </p>
      </div>

      <details className="rounded-lg border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-500">
          Agregar ejercicio personalizado
        </summary>
        <form action={createCustomExercise} className="mt-3 flex flex-col gap-2">
          <input
            name="name"
            placeholder="Nombre del ejercicio"
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-slate-500"
          />
          <div className="flex gap-2">
            <select
              name="primary_muscle_group"
              defaultValue=""
              className="flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-500"
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
              className="flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-500"
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
            className="rounded-lg bg-slate-900 px-4 py-2 text-base font-medium text-white"
          >
            Agregar
          </button>
        </form>
      </details>

      <ExerciseLibrary exercises={exercises} />
    </main>
  );
}
