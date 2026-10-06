import Link from "next/link";
import { ChevronRight, FolderKanban } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import type { ProjectStatus } from "./actions";
import { NewProjectButton } from "./project-editor";

const SECTIONS: { status: ProjectStatus; title: string }[] = [
  { status: "activo", title: "Activos" },
  { status: "pausado", title: "Pausados" },
  { status: "terminado", title: "Terminados" },
  { status: "archivado", title: "Archivados" },
];

export default async function ProyectosPage() {
  const supabase = await createSupabaseServerClient();
  const [projectsRes, tasksRes] = await Promise.all([
    supabase.from("projects").select("id, name, status, next_steps").order("updated_at", { ascending: false }),
    supabase.from("tasks").select("project_id").not("project_id", "is", null).neq("status", "completada"),
  ]);

  const pendingByProject = new Map<string, number>();
  for (const row of tasksRes.data ?? []) {
    pendingByProject.set(row.project_id, (pendingByProject.get(row.project_id) ?? 0) + 1);
  }
  const projects = projectsRes.data ?? [];

  return (
    <Page>
      <PageHeader title="Proyectos" subtitle="Estado y próximos pasos" backHref="/mas" backLabel="Más" />
      <NewProjectButton />

      {projects.length === 0 && (
        <Card className="px-4 py-5 text-center text-sm text-muted">
          Sin proyectos. Crea uno o convierte una idea desde Notas e ideas.
        </Card>
      )}

      {SECTIONS.map(({ status, title }) => {
        const list = projects.filter((p) => p.status === status);
        if (list.length === 0) return null;
        return (
          <section key={status} className="space-y-2">
            <SectionTitle icon={<FolderKanban size={16} aria-hidden />}>
              {title} ({list.length})
            </SectionTitle>
            <Card className="divide-y divide-line">
              {list.map((project) => {
                const pending = pendingByProject.get(project.id) ?? 0;
                const nextStep = project.next_steps?.split("\n").find((line: string) => line.trim());
                return (
                  <Link key={project.id} href={`/proyectos/${project.id}`} className="pressable flex min-h-16 items-center gap-3 px-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{project.name}</span>
                      <span className="block truncate text-sm text-muted">
                        {nextStep ? `Sigue: ${nextStep.trim()}` : "Sin próximo paso definido"}
                      </span>
                    </span>
                    {pending > 0 && (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                        {pending} {pending === 1 ? "tarea" : "tareas"}
                      </span>
                    )}
                    <ChevronRight size={18} className="text-muted" aria-hidden />
                  </Link>
                );
              })}
            </Card>
          </section>
        );
      })}
    </Page>
  );
}
