import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { WorkoutSession } from "./workout-session";

export default async function EntrenarPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: routines }, { data: exercises }] = await Promise.all([
    supabase
      .from("routines")
      .select("id, name, routine_exercises(exercise_id, target_sets, exercises(name))")
      .order("created_at", { ascending: true }),
    supabase.from("exercises").select("id, name").order("name", { ascending: true }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-4 pb-24">
      <AppNav current="/gimnasio" />

      <div>
        <h1 className="text-xl font-semibold">Entrenar</h1>
        <p className="text-sm text-slate-500">Tu sesión se guarda localmente aunque pierdas señal.</p>
      </div>

      <WorkoutSession routines={routines ?? []} exercises={exercises ?? []} />
    </main>
  );
}
