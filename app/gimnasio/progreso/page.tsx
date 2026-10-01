import Link from "next/link";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatShortDate, getLocalDateString, getLocalWeekStart } from "@/lib/date";
import { translateMuscleGroup } from "@/lib/exercises";
import { formatElapsed } from "@/lib/gimnasio/live-stats";
import { summarizeWorkout, summarizeWorkouts } from "@/lib/gimnasio/progress";
import { mapWorkoutRow, WORKOUT_WITH_SETS_SELECT } from "@/lib/gimnasio/workout-rows";

const HISTORY_LIMIT = 50;

const kg = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

export default async function ProgresoPage() {
  const supabase = await createSupabaseServerClient();

  const { data: workoutRows } = await supabase
    .from("workouts")
    .select(WORKOUT_WITH_SETS_SELECT)
    .not("finished_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  const workouts = (workoutRows ?? []).map((row) => {
    const workout = mapWorkoutRow(row);
    return { ...workout, localDate: getLocalDateString(new Date(workout.startedAt)) };
  });

  const weekStart = getLocalWeekStart(getLocalDateString());
  const week = summarizeWorkouts(workouts.filter((w) => w.localDate >= weekStart));

  // Ejercicios entrenados alguna vez, del más reciente al más antiguo.
  const trainedExercises = new Map<string, string>();
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      if (!trainedExercises.has(exercise.exerciseId)) {
        trainedExercises.set(exercise.exerciseId, exercise.exerciseName);
      }
    }
  }

  return (
    <Page>
      <PageHeader title="Progreso" backHref="/gimnasio" backLabel="Gimnasio" />

      <section className="space-y-3 rounded-2xl border border-line bg-surface p-3">
        <h2 className="text-sm font-medium text-muted">Esta semana</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-semibold">{week.sessions}</p>
            <p className="text-xs text-muted">sesiones</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{week.workingSets}</p>
            <p className="text-xs text-muted">series</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{kg.format(week.volumeKg)}</p>
            <p className="text-xs text-muted">kg volumen</p>
          </div>
        </div>
        {week.volumeByMuscle.length > 0 && (
          <ul className="space-y-1">
            {week.volumeByMuscle.map((item) => (
              <li key={item.muscle ?? "sin-grupo"} className="flex justify-between text-sm">
                <span>{translateMuscleGroup(item.muscle)}</span>
                <span className="text-muted">{kg.format(item.volumeKg)} kg</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted">Historial</h2>
        {workouts.length === 0 ? (
          <p className="text-sm text-muted">
            Aún no hay entrenamientos finalizados.{" "}
            <Link href="/gimnasio/entrenar" className="underline">
              Empieza uno
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-1.5">
            {workouts.map((workout) => {
              const summary = summarizeWorkout(workout);
              return (
                <li key={workout.id}>
                  <Link
                    href={`/gimnasio/progreso/${workout.id}`}
                    className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5"
                  >
                    <div>
                      <p className="font-medium">{workout.name ?? "Entrenamiento"}</p>
                      <p className="text-xs text-muted">
                        {formatShortDate(workout.localDate)} · {formatElapsed(summary.durationSeconds)}
                      </p>
                    </div>
                    <p className="text-sm text-muted">{kg.format(summary.volumeKg)} kg</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {trainedExercises.size > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted">Por ejercicio</h2>
          <ul className="space-y-1.5">
            {[...trainedExercises].map(([exerciseId, name]) => (
              <li key={exerciseId}>
                <Link
                  href={`/gimnasio/progreso/ejercicio/${exerciseId}`}
                  className="block rounded-lg border border-line px-3 py-2.5"
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
