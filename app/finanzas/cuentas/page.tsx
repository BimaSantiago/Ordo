import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { loadAccounts } from "@/lib/finance/load";
import { formatMoney } from "@/lib/finance/money";
import { AccountItem, NewAccountButton } from "./account-editor";

export default async function CuentasPage() {
  const supabase = await createSupabaseServerClient();
  const accounts = await loadAccounts(supabase);
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const total = active.reduce((sum, a) => sum + a.balance, 0);

  return (
    <Page>
      <PageHeader title="Cuentas" subtitle={`Saldo total ${formatMoney(total)}`} backHref="/finanzas" backLabel="Finanzas" />

      {active.length > 0 ? (
        <Card className="divide-y divide-line">
          {active.map((account) => (
            <AccountItem key={account.id} account={account} />
          ))}
        </Card>
      ) : (
        <Card className="px-4 py-5 text-center text-sm text-muted">Aún no tienes cuentas.</Card>
      )}

      <NewAccountButton />

      <p className="px-1 text-xs text-muted">
        Para pagar la tarjeta de crédito, registra una transferencia de tu cuenta de débito a la tarjeta.
      </p>

      {archived.length > 0 && (
        <section className="space-y-2">
          <SectionTitle>Archivadas</SectionTitle>
          <Card className="divide-y divide-line">
            {archived.map((account) => (
              <AccountItem key={account.id} account={account} />
            ))}
          </Card>
        </section>
      )}
    </Page>
  );
}
