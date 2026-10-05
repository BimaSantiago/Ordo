import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { MfaSettings } from "./mfa-settings";

export default function SeguridadPage() {
  return (
    <Page>
      <PageHeader title="Seguridad" subtitle="Verificación en dos pasos" backHref="/mas" backLabel="Más" />
      <MfaSettings />
    </Page>
  );
}
