import Link from "next/link";
import { notFound } from "next/navigation";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressChart } from "@/components/progress-chart";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatShortDate, getLocalDateString } from "@/lib/date";
import { EXERCISE_INFO_COLUMNS, translateMuscleGroup, type ExerciseInfo } from "@/lib/exercises";
import { ExerciseAnimation } from "@/components/exercise/exercise-animation";
import { MuscleMap } from "@/components/exercise/muscle-map";
import { summarizeExerciseSessions } from "@/lib/gimnasio/progress";
import { formatRecordValue, RECORD_LABELS, RECORD_TYPES, type RecordType } from "@/lib/gimnasio/records";
import { mapWorkoutRow, WORKOUT_WITH_MATCHING_SETS_SELECT } from "@/lib/gimnasio/workout-rows";

const SESSION_LIMIT = 100;

export default async function ExerciseProgressPage({ params }: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: exercise } = await supabase
    .from("exercises")
    .select(EXERCISE_INFO_COLUMNS)
    .eq("id", exerciseId)
    .returns<ExerciseInfo[]>()
    .maybeSingle();

  if (!exercise) notFound();

  const [{ data: workoutRows }, { data: recordRows }] = await Promise.all([
    supabase
      .from("workouts")
      .select(WORKOUT_WITH_MATCHING_SETS_SELECT)
      .eq("workout_exercises.exercise_id", exerciseId)
      .not("finished_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(SESSION_LIMIT),
    supabase
      .from("personal_records")
      .select("record_type, value, achieved_at")
      .eq("exercise_id", exerciseId),
  ]);

  const sessions = (workoutRows ?? []).map((row) => {
    const workout = mapWorkoutRow(row);
    return {
      workoutId: workout.id,
      workoutName: workout.name,
      localDate: getLocalDateString(new Date(workout.startedAt)),
      sets: workout.exercises.flatMap((e) => e.sets),
    };
  });

  const points = summarizeExerciseSessions(sessions);

  // El récord vigente de cada tipo es el valor más alto registrado.
  const currentRecords = new Map<RecordType, { value: number; achievedAt: string }>();
  for (const record of recordRows ?? []) {
    const value = Number(record.value);
    const type = record.record_type as RecordType;
    const previous = currentRecords.get(type);
    if (!previous || value > previous.value) currentRecords.set(type, { value, achievedAt: record.achieved_at });
  }

  const firstDate = points[0]?.localDate;
  const { data: bodyWeightRows } = firstDate
    ? await supabase
        .from("body_weight_logs")
        .select("local_date, weight_kg")
        .gte("local_date", firstDate)
        .order("local_date", { ascending: true })
    : { data: [] };

  const bodyWeight = (bodyWeightRows ?? []).map((row) => ({
    localDate: row.local_date as string,
    weightKg: Number(row.weight_kg),
  }));

  return (
    <Page>
      <PageHeader
        title={exercise.name}
        subtitle={translateMuscleGroup(exercise.primary_muscle_group)}
        backHref="/gimnasio/progreso"
        backLabel="Progreso"
      />

      <section className="grid gap-3 sm:grid-cols-2">
        <ExerciseAnimation name={exercise.name} imagePaths={exercise.image_paths} />
        <MuscleMap primary={exercise.primary_muscle_group} secondaries={exercise.secondary_muscle_groups} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted">Récords</h2>
        <div className="grid grid-cols-2 gap-2">
          {RECORD_TYPES.map((type) => {
            const record = currentRecords.get(type);
            return (
              <div key={type} className="rounded-lg border border-line px-3 py-2">
                <p className="text-xs text-muted">{RECORD_LABELS[type]}</p>
                <p className="font-semibold">{record ? formatRecordValue(type, record.value) : "—"}</p>
                {record && (
                  <p className="text-xs text-muted">{formatShortDate(getLocalDateString(new Date(record.achievedAt)))}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted">Progresión</h2>
        <ProgressChart points={points} bodyWeight={bodyWeight} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted">Sesiones</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted">Aún no has hecho este ejercicio en un entrenamiento finalizado.</p>
        ) : (
          <ul className="space-y-1.5">
            {sessions.map((session) => (
              <li key={session.workoutId}>
                <Link
                  href={`/gimnasio/progreso/${session.workoutId}`}
                  className="block rounded-lg border border-line px-3 py-2"
                >
                  <p className="text-sm font-medium">
                    {formatShortDate(session.localDate)}
                    {session.workoutName && <span className="font-normal text-muted"> · {session.workoutName}</span>}
                  </p>
                  <p className="text-sm text-muted">
                    {session.sets
                      .filter((set) => set.completed)
                      .map((set) => `${set.weightKg ?? "-"}×${set.reps ?? "-"}`)
                      .join(", ") || "Sin series completadas"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}
