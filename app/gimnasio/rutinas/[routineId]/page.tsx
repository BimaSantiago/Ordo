import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { addRoutineExercise } from "../actions";
import { ExercisePicker } from "../exercise-picker";
import { RoutineExerciseList } from "../routine-exercise-list";

export default async function RoutineDetailPage({
  params,
}: {
  params: Promise<{ routineId: string }>;
}) {
  const { routineId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: routine } = await supabase
    .from("routines")
    .select("id, name")
    .eq("id", routineId)
    .single();

  if (!routine) notFound();

  const { data: routineExercises } = await supabase
    .from("routine_exercises")
    .select("id, target_sets, target_rep_range, exercises(name)")
    .eq("routine_id", routineId)
    .order("position", { ascending: true });

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, primary_muscle_group")
    .order("name", { ascending: true });

  const boundAdd = addRoutineExercise.bind(null, routineId);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-4 pb-24">
      <AppNav current="/gimnasio" />

      <div>
        <h1 className="text-xl font-semibold">{routine.name}</h1>
        <p className="text-sm text-slate-500">Ejercicios de la rutina.</p>
      </div>

      <RoutineExerciseList routineId={routineId} items={routineExercises ?? []} />

      <section className="space-y-2 rounded-lg border border-slate-200 p-3">
        <h2 className="text-sm font-medium text-slate-500">Agregar ejercicio</h2>
        <ExercisePicker exercises={exercises ?? []} onAdd={boundAdd} />
      </section>
    </main>
  );
}
