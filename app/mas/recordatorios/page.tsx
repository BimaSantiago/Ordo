import { Bell, Smartphone } from "lucide-react";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addDaysToLocalDate, formatShortDate, getLocalDateString, getLocalTimeString } from "@/lib/date";
import { PushSettings } from "./push-settings";

function reminderLabel(remindAt: string, today: string): string {
  const instant = new Date(remindAt);
  const date = getLocalDateString(instant);
  const day = date === today ? "Hoy" : date === addDaysToLocalDate(today, 1) ? "Mañana" : formatShortDate(date);
  return `${day} · ${getLocalTimeString(instant)}`;
}

export default async function RecordatoriosPage() {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const today = getLocalDateString(now);

  const [{ data: upcoming }, { count: devices }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, remind_at")
      .eq("status", "pendiente")
      .is("reminded_at", null)
      .gte("remind_at", now.toISOString())
      .order("remind_at")
      .limit(15),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }),
  ]);

  return (
    <Page>
      <PageHeader title="Recordatorios" subtitle="Avisos de tus tareas" backHref="/mas" backLabel="Más" />

      <PushSettings />

      <p className="flex items-center gap-2 text-sm text-muted">
        <Smartphone size={16} aria-hidden />
        {devices === 1 ? "1 dispositivo recibe avisos." : `${devices ?? 0} dispositivos reciben avisos.`}
      </p>

      <section className="space-y-2">
        <SectionTitle icon={<Bell size={16} aria-hidden />}>Próximos avisos</SectionTitle>
        {upcoming && upcoming.length > 0 ? (
          <Card className="divide-y divide-line">
            {upcoming.map((task) => (
              <div key={task.id} className="flex min-h-12 items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate">{task.title}</span>
                <span className="shrink-0 text-sm text-muted tabular-nums">{reminderLabel(task.remind_at!, today)}</span>
              </div>
            ))}
          </Card>
        ) : (
          <Card className="p-4 text-sm text-muted">
            No hay avisos programados. Al crear una tarea con el &quot;+&quot;, elige un recordatorio.
          </Card>
        )}
      </section>
    </Page>
  );
}
