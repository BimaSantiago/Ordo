import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EXERCISE_INFO_COLUMNS, type ExerciseInfo } from "@/lib/exercises";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
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
    .select(EXERCISE_INFO_COLUMNS)
    .order("name", { ascending: true })
    .returns<ExerciseInfo[]>();

  const boundAdd = addRoutineExercise.bind(null, routineId);

  return (
    <Page>
      <PageHeader title={routine.name} subtitle="Ejercicios de la rutina" backHref="/gimnasio/rutinas" backLabel="Rutinas" />

      <RoutineExerciseList routineId={routineId} items={routineExercises ?? []} />

      <section className="space-y-2 rounded-lg border border-line p-3">
        <h2 className="text-sm font-medium text-muted">Agregar ejercicio</h2>
        <ExercisePicker exercises={exercises ?? []} onAdd={boundAdd} />
      </section>
    </Page>
  );
}
