import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { getLocalDateString } from "@/lib/date";
import { loadNutritionDays, loadNutritionGoals } from "@/lib/nutrition/load";
import { NutritionPanel } from "./nutrition-panel";

export default async function ComidaPage() {
  const supabase = await createSupabaseServerClient();
  const today = getLocalDateString();

  const [days, goals, { data: weightRows }] = await Promise.all([
    loadNutritionDays(supabase),
    loadNutritionGoals(supabase),
    supabase.from("body_weight_logs").select("local_date, weight_kg").order("local_date", { ascending: true }),
  ]);
  // numeric de Postgres puede llegar como string.
  const weights = (weightRows ?? []).map((row) => ({ localDate: row.local_date as string, value: Number(row.weight_kg) }));

  return (
    <Page>
      <PageHeader title="Comida" subtitle="Totales diarios de Fitia" backHref="/hoy" backLabel="Hoy" />
      <NutritionPanel days={days} goals={goals} weights={weights} today={today} />
    </Page>
  );
}
