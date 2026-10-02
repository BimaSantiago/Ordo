import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { addDaysToLocalDate, getLocalDateString } from "@/lib/date";
import { loadHabits } from "@/lib/habits/load";
import { HabitBoard } from "./habit-board";

export default async function HabitosPage() {
  const supabase = await createSupabaseServerClient();
  const today = getLocalDateString();
  // Dos años de historial: alcanza para la mejor racha y el mes en curso.
  const habits = await loadHabits(supabase, { sinceDate: addDaysToLocalDate(today, -730), includeArchived: true });

  return (
    <Page>
      <PageHeader title="Hábitos" subtitle="Rachas, semana y mes" backHref="/hoy" backLabel="Hoy" />
      <HabitBoard habits={habits} today={today} />
    </Page>
  );
}
