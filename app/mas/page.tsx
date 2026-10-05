import Link from "next/link";
import { Bell, ChevronRight, Download, Flame, Scale, Settings, ShieldCheck, Tags, Wallet, type LucideIcon } from "lucide-react";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SignOutButton } from "./sign-out-button";

const LINKS: { href: string; label: string; description: string; icon: LucideIcon }[] = [
  {
    href: "/finanzas",
    label: "Finanzas",
    description: "Cuentas, gastos, ingresos y presupuesto del mes.",
    icon: Wallet,
  },
  {
    href: "/habitos",
    label: "Hábitos",
    description: "Rachas, historial de la semana y del mes.",
    icon: Flame,
  },
  {
    href: "/peso",
    label: "Peso y medidas",
    description: "Tendencia del peso y medidas corporales.",
    icon: Scale,
  },
  {
    href: "/mas/ajustes",
    label: "Ajustes",
    description: "Kilogramos o libras, y tema claro u oscuro.",
    icon: Settings,
  },
  {
    href: "/mas/seguridad",
    label: "Seguridad",
    description: "Verificación en dos pasos con app autenticadora.",
    icon: ShieldCheck,
  },
  {
    href: "/mas/respaldo",
    label: "Respaldo",
    description: "Descarga todos tus datos en JSON o CSV.",
    icon: Download,
  },
  {
    href: "/materias",
    label: "Materias y actividades",
    description: "Nombres y colores de lo que aparece en tu semana.",
    icon: Tags,
  },
];

export default function MasPage() {
  return (
    <Page>
      <PageHeader title="Más" />

      <Card className="divide-y divide-line">
        {LINKS.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href} className="pressable flex min-h-16 items-center gap-3 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon size={20} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{label}</span>
              <span className="block text-sm text-muted">{description}</span>
            </span>
            <ChevronRight size={20} className="text-muted" aria-hidden />
          </Link>
        ))}
        <div className="flex min-h-16 items-center gap-3 px-4 py-3 opacity-60">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted">
            <Bell size={20} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Recordatorios</span>
            <span className="block text-sm text-muted">
              Ya puedes elegir el aviso al crear una tarea. Las notificaciones llegan en la siguiente fase.
            </span>
          </span>
        </div>
      </Card>

      <SignOutButton />
    </Page>
  );
}
