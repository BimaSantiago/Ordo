import Link from "next/link";
import { signOut } from "@/app/hoy/actions";

const LINKS = [
  { href: "/hoy", label: "Hoy" },
  { href: "/horario", label: "Horario" },
  { href: "/materias", label: "Materias" },
];

export function AppNav({ current }: { current: string }) {
  return (
    <header className="flex items-center justify-between gap-2 pt-2">
      <nav className="flex gap-3 text-sm">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              link.href === current
                ? "font-semibold text-slate-900"
                : "text-slate-500"
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <form action={signOut}>
        <button type="submit" className="text-sm text-slate-400">
          Salir
        </button>
      </form>
    </header>
  );
}
