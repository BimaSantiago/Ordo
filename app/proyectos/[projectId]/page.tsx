import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckSquare, Lightbulb, Plus, StickyNote } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { TaskRow, type TaskRowData } from "@/components/task-row";
import { QuickAddButton } from "@/components/quick-add/quick-add-button";
import type { ProjectStatus } from "../actions";
import { ProjectEditor } from "../project-editor";

type Category = { name: string; color: string } | { name: string; color: string }[] | null;
const one = (c: Category) => (Array.isArray(c) ? (c[0] ?? null) : c);

export default async function ProyectoPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createSupabaseServerClient();

  const [projectRes, tasksRes, notesRes, ideasRes] = await Promise.all([
    supabase.from("projects").select("id, name, status, description, next_steps").eq("id", projectId).maybeSingle(),
    supabase
      .from("tasks")
      .select("id, title, status, due_date, category_id, start_time, end_time, remind_at, schedule_categories(name, color)")
      .eq("project_id", projectId)
      .order("status", { ascending: true })
      .order("due_date", { ascending: true }),
    supabase.from("notes").select("id, title, body").eq("project_id", projectId).order("updated_at", { ascending: false }),
    supabase.from("ideas").select("id, title").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);

  const project = projectRes.data;
  if (!project) notFound();

  const tasks: TaskRowData[] = (tasksRes.data ?? []).map((row) => {
    const category = one(row.schedule_categories as Category);
    return {
      id: row.id,
      title: row.title,
      dueDate: row.due_date,
      categoryId: row.category_id,
      startTime: row.start_time,
      endTime: row.end_time,
      remindAt: row.remind_at,
      completed: row.status === "completada",
      categoryName: category?.name ?? null,
      categoryColor: category?.color ?? null,
    };
  });
  const pending = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  return (
    <Page>
      <PageHeader title="" backHref="/proyectos" backLabel="Proyectos" />
      <ProjectEditor
        project={{
          id: project.id,
          name: project.name,
          status: project.status as ProjectStatus,
          description: project.description,
          nextSteps: project.next_steps,
        }}
      />

      <section className="space-y-2">
        <SectionTitle
          icon={<CheckSquare size={16} aria-hidden />}
          action={
            <QuickAddButton prefill={{ tab: "tarea", projectId: project.id }}>
              <Plus size={16} aria-hidden />
              Tarea
            </QuickAddButton>
          }
        >
          Tareas {tasks.length > 0 && `(${done.length}/${tasks.length})`}
        </SectionTitle>
        {tasks.length === 0 ? (
          <Card className="px-4 py-4 text-sm text-muted">Agrega tareas con fecha para que aparezcan también en Hoy.</Card>
        ) : (
          <div className="space-y-2">
            {[...pending, ...done].map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>

      {(notesRes.data?.length ?? 0) + (ideasRes.data?.length ?? 0) > 0 && (
        <section className="space-y-2">
          <SectionTitle icon={<StickyNote size={16} aria-hidden />}>Notas e ideas</SectionTitle>
          <Card className="divide-y divide-line">
            {(ideasRes.data ?? []).map((idea) => (
              <Link key={idea.id} href="/notas?tab=ideas" className="pressable flex min-h-12 items-center gap-2 px-3 text-sm">
                <Lightbulb size={16} className="shrink-0 text-accent" aria-hidden />
                <span className="truncate">{idea.title}</span>
              </Link>
            ))}
            {(notesRes.data ?? []).map((note) => (
              <Link key={note.id} href="/notas" className="pressable flex min-h-12 items-center gap-2 px-3 text-sm">
                <StickyNote size={16} className="shrink-0 text-muted" aria-hidden />
                <span className="truncate">{note.title || note.body}</span>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </Page>
  );
}
