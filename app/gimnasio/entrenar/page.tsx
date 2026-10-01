import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EXERCISE_INFO_COLUMNS, type ExerciseInfo } from "@/lib/exercises";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { WorkoutSession } from "./workout-session";

export default async function EntrenarPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: routines }, { data: exercises }] = await Promise.all([
    supabase
      .from("routines")
      .select("id, name, routine_exercises(exercise_id, target_sets, exercises(name))")
      .order("created_at", { ascending: true }),
    supabase.from("exercises").select(EXERCISE_INFO_COLUMNS).order("name", { ascending: true }).returns<ExerciseInfo[]>(),
  ]);

  return (
    <Page>
      <PageHeader
        title="Entrenar"
        subtitle="Tu sesión se guarda en el teléfono aunque pierdas señal"
        backHref="/gimnasio"
        backLabel="Gimnasio"
      />
      <WorkoutSession routines={routines ?? []} exercises={exercises ?? []} />
    </Page>
  );
}
