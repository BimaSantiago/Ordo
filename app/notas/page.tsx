import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { getLocalDateString } from "@/lib/date";
import { NotesView, type IdeaItem, type NoteItem } from "./notes-view";

export default async function NotasPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [notesRes, ideasRes, projectsRes] = await Promise.all([
    supabase
      .from("notes")
      .select("id, title, body, pinned, project_id, updated_at")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase.from("ideas").select("id, title, body, project_id, created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("projects").select("id, name").neq("status", "archivado").order("name"),
  ]);

  const notes: NoteItem[] = (notesRes.data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    pinned: n.pinned,
    projectId: n.project_id,
    updatedDate: getLocalDateString(new Date(n.updated_at)),
  }));
  const ideas: IdeaItem[] = (ideasRes.data ?? []).map((i) => ({
    id: i.id,
    title: i.title,
    body: i.body,
    projectId: i.project_id,
    createdDate: getLocalDateString(new Date(i.created_at)),
  }));

  return (
    <Page>
      <PageHeader title="Notas e ideas" subtitle="Lo importante, a la mano" backHref="/mas" backLabel="Más" />
      <NotesView notes={notes} ideas={ideas} projects={projectsRes.data ?? []} initialTab={tab === "ideas" ? "ideas" : "notas"} />
    </Page>
  );
}
