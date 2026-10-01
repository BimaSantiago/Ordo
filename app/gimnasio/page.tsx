import Link from "next/link";
import { ChevronRight, Library, ListChecks, Play, TrendingUp, type LucideIcon } from "lucide-react";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

const SECTIONS: { href: string; title: string; description: string; icon: LucideIcon }[] = [
  {
    href: "/gimnasio/progreso",
    title: "Progreso",
    description: "Historial, récords, gráficas por ejercicio y resumen semanal.",
    icon: TrendingUp,
  },
  {
    href: "/gimnasio/rutinas",
    title: "Rutinas",
    description: "Plantillas de ejercicios, series objetivo y rangos de reps.",
    icon: ListChecks,
  },
  {
    href: "/gimnasio/ejercicios",
    title: "Ejercicios",
    description: "Biblioteca de ejercicios y tus ejercicios personalizados.",
    icon: Library,
  },
];

export default function GimnasioPage() {
  return (
    <Page>
      <PageHeader title="Gimnasio" subtitle="Registro de entrenamientos y progresión" />

      <Link
        href="/gimnasio/entrenar"
        className="pressable flex min-h-20 items-center gap-4 rounded-2xl bg-primary px-4 text-on-primary"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-on-primary/15">
          <Play size={24} fill="currentColor" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-lg font-bold">Entrenar</span>
          <span className="block text-sm opacity-85">Vacío o desde una rutina</span>
        </span>
        <ChevronRight size={22} aria-hidden />
      </Link>

      <Card className="divide-y divide-line">
        {SECTIONS.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="pressable flex min-h-16 items-center gap-3 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon size={20} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{title}</span>
              <span className="block text-sm text-muted">{description}</span>
            </span>
            <ChevronRight size={20} className="text-muted" aria-hidden />
          </Link>
        ))}
      </Card>
    </Page>
  );
}
