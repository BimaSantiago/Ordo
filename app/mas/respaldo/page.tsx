import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, SectionTitle } from "@/components/ui/card";
import { EXPORT_TABLES } from "@/lib/export/tables";

export default function RespaldoPage() {
  return (
    <Page>
      <PageHeader title="Respaldo" subtitle="Descarga todos tus datos" backHref="/mas" backLabel="Más" />

      <a
        href="/api/export?format=json"
        download
        className="pressable flex min-h-16 items-center gap-3 rounded-2xl bg-primary px-4 text-on-primary"
      >
        <FileJson size={24} aria-hidden />
        <span className="flex-1">
          <span className="block font-bold">Descargar todo (JSON)</span>
          <span className="block text-sm opacity-85">Un archivo con todas tus tablas. Ideal para guardar un respaldo.</span>
        </span>
        <Download size={20} aria-hidden />
      </a>

      <section className="space-y-2">
        <SectionTitle icon={<FileSpreadsheet size={16} aria-hidden />}>Por tabla (CSV, para Excel o Sheets)</SectionTitle>
        <Card className="divide-y divide-line">
          {EXPORT_TABLES.map(({ table, label }) => (
            <a
              key={table}
              href={`/api/export?format=csv&table=${table}`}
              download
              className="pressable flex min-h-12 items-center justify-between gap-2 px-3"
            >
              <span>{label}</span>
              <Download size={18} className="text-muted" aria-hidden />
            </a>
          ))}
        </Card>
      </section>

      <p className="text-xs text-muted">
        Los archivos solo incluyen tus datos. Guárdalos en un lugar seguro: contienen información personal (peso, notas…).
      </p>
    </Page>
  );
}
