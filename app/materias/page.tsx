import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { CategoryItem } from "./category-item";
import { NewCategoryForm } from "./new-category-form";

export default async function MateriasPage() {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("schedule_categories")
    .select("id, name, color, type, archived")
    .order("archived", { ascending: true })
    .order("created_at", { ascending: true });

  const categories = data ?? [];
  const active = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  return (
    <Page>
      <PageHeader
        title="Materias"
        subtitle="Escuela y actividades de tu día a día"
        backHref="/mas"
        backLabel="Más"
      />

      {active.length > 0 ? (
        <Card className="divide-y divide-line">
          {active.map((category) => (
            <CategoryItem key={category.id} {...category} />
          ))}
        </Card>
      ) : (
        <Card className="px-4 py-5 text-center text-sm text-muted">Aún no tienes materias. Crea la primera aquí abajo.</Card>
      )}

      <section className="space-y-2">
        <SectionTitle>Nueva materia</SectionTitle>
        <Card>
          <NewCategoryForm count={categories.length} />
        </Card>
      </section>

      {archived.length > 0 && (
        <section className="space-y-2">
          <SectionTitle>Archivadas</SectionTitle>
          <Card className="divide-y divide-line">
            {archived.map((category) => (
              <CategoryItem key={category.id} {...category} />
            ))}
          </Card>
        </section>
      )}
    </Page>
  );
}
