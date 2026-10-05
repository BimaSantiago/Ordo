import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm } from "./settings-form";

export default function AjustesPage() {
  return (
    <Page>
      <PageHeader title="Ajustes" backHref="/mas" backLabel="Más" />
      <SettingsForm />
    </Page>
  );
}
