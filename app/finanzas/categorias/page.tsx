import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { loadBudgets, loadCategories, type FinanceCategory } from "@/lib/finance/load";
import { formatMoney } from "@/lib/finance/money";
import { FinanceCategoryItem, NewFinanceCategoryButton } from "./category-editor";

export default async function CategoriasFinanzasPage() {
  const supabase = await createSupabaseServerClient();
  const [categories, budgets] = await Promise.all([loadCategories(supabase), loadBudgets(supabase)]);

  const totalBudget = categories
    .filter((c) => c.kind === "gasto" && !c.archived)
    .reduce((sum, c) => sum + (budgets.get(c.id) ?? 0), 0);

  const section = (kind: FinanceCategory["kind"], title: string) => {
    const list = categories.filter((c) => c.kind === kind && !c.archived);
    return (
      <section className="space-y-2">
        <SectionTitle>{title}</SectionTitle>
        <Card className="divide-y divide-line">
          {list.map((category) => (
            <FinanceCategoryItem key={category.id} category={category} budget={budgets.get(category.id) ?? null} />
          ))}
          <NewFinanceCategoryButton kind={kind} />
        </Card>
      </section>
    );
  };

  const archived = categories.filter((c) => c.archived);

  return (
    <Page>
      <PageHeader
        title="Categorías"
        subtitle={totalBudget > 0 ? `Presupuesto total ${formatMoney(totalBudget, { round: true })} al mes` : "Y límites mensuales de gasto"}
        backHref="/finanzas"
        backLabel="Finanzas"
      />
      {section("gasto", "Gastos")}
      {section("ingreso", "Ingresos")}
      {archived.length > 0 && (
        <section className="space-y-2">
          <SectionTitle>Archivadas</SectionTitle>
          <Card className="divide-y divide-line">
            {archived.map((category) => (
              <FinanceCategoryItem key={category.id} category={category} budget={budgets.get(category.id) ?? null} />
            ))}
          </Card>
        </section>
      )}
    </Page>
  );
}
