import Link from "next/link";
import { notFound } from "next/navigation";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings-server";
import { formatWeight } from "@/lib/units";
import { formatDisplayDate, getLocalDateString } from "@/lib/date";
import { formatElapsed } from "@/lib/gimnasio/live-stats";
import { summarizeWorkout } from "@/lib/gimnasio/progress";
import { SET_TYPE_LABELS, type SetType } from "@/lib/gimnasio/workout-draft";
import { mapWorkoutRow, WORKOUT_WITH_SETS_SELECT } from "@/lib/gimnasio/workout-rows";


export default async function WorkoutDetailPage({ params }: { params: Promise<{ workoutId: string }> }) {
  const { workoutId } = await params;
  const supabase = await createSupabaseServerClient();
  const { weightUnit } = await getSettings();

  const { data: row } = await supabase
    .from("workouts")
    .select(WORKOUT_WITH_SETS_SELECT)
    .eq("id", workoutId)
    .maybeSingle();

  if (!row) notFound();

  const workout = mapWorkoutRow(row);
  const summary = summarizeWorkout(workout);

  return (
    <Page>
      <PageHeader
        title={workout.name ?? "Entrenamiento"}
        subtitle={`${formatDisplayDate(getLocalDateString(new Date(workout.startedAt)))} · ${formatElapsed(
          summary.durationSeconds
        )} · ${formatWeight(summary.volumeKg, weightUnit, { decimals: 0 })}`}
        backHref="/gimnasio/progreso"
        backLabel="Progreso"
      />
      {workout.notes && <p className="text-sm">{workout.notes}</p>}

      <div className="space-y-3">
        {workout.exercises.map((exercise) => (
          <section key={exercise.id} className="space-y-1.5 rounded-2xl border border-line bg-surface p-3">
            <Link href={`/gimnasio/progreso/ejercicio/${exercise.exerciseId}`} className="font-medium underline-offset-2 hover:underline">
              {exercise.exerciseName}
            </Link>
            {exercise.notes && <p className="text-sm text-muted">{exercise.notes}</p>}
            <ol className="space-y-0.5 text-sm">
              {exercise.sets.map((set, index) => (
                <li key={set.id} className={set.completed ? "" : "text-muted line-through"}>
                  {index + 1}. {set.weightKg == null ? "-" : formatWeight(set.weightKg, weightUnit)} × {set.reps ?? "-"}
                  {set.setType !== "normal" && (
                    <span className="text-muted"> · {SET_TYPE_LABELS[set.setType as SetType] ?? set.setType}</span>
                  )}
                  {set.rpe != null && <span className="text-muted"> · RPE {set.rpe}</span>}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </Page>
  );
}
