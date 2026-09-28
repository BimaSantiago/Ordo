import Link from "next/link";
import { AppNav } from "@/components/app-nav";

const SECTIONS = [
  {
    href: "/gimnasio/entrenar",
    title: "Entrenar",
    description: "Inicia un entrenamiento vacío o desde una rutina.",
  },
  {
    href: "/gimnasio/rutinas",
    title: "Rutinas",
    description: "Plantillas de ejercicios, series objetivo y rangos de reps.",
  },
  {
    href: "/gimnasio/ejercicios",
    title: "Ejercicios",
    description: "Biblioteca de ejercicios y tus ejercicios personalizados.",
  },
];

export default function GimnasioPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-4 pb-24">
      <AppNav current="/gimnasio" />

      <div>
        <h1 className="text-xl font-semibold">Gimnasio</h1>
        <p className="text-sm text-slate-500">Registro de entrenamientos y progresión.</p>
      </div>

      <section className="space-y-2">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="block rounded-lg border border-slate-200 px-3 py-3"
          >
            <p className="font-medium">{section.title}</p>
            <p className="text-sm text-slate-500">{section.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
