import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { getLocalDateString } from "@/lib/date";
import { WeightPanel } from "./weight-panel";
import { MeasurementsPanel, type Measurement } from "./measurements-panel";

export default async function PesoPage() {
  const supabase = await createSupabaseServerClient();
  const today = getLocalDateString();

  const [{ data: weightRows }, { data: measurementRows }] = await Promise.all([
    supabase.from("body_weight_logs").select("local_date, weight_kg").order("local_date", { ascending: true }),
    supabase.from("body_measurements").select("id, local_date, type, value").order("local_date", { ascending: true }),
  ]);

  // numeric de Postgres puede llegar como string.
  const weights = (weightRows ?? []).map((row) => ({ localDate: row.local_date as string, value: Number(row.weight_kg) }));
  const measurements: Measurement[] = (measurementRows ?? []).map((row) => ({
    id: row.id,
    localDate: row.local_date,
    type: row.type,
    value: Number(row.value),
  }));

  return (
    <Page>
      <PageHeader title="Peso y medidas" subtitle="Tendencia y registros" backHref="/hoy" backLabel="Hoy" />
      <WeightPanel weights={weights} today={today} />
      <MeasurementsPanel measurements={measurements} today={today} />
    </Page>
  );
}
