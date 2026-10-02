"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, CalendarRange, Dumbbell, Menu, Plus } from "lucide-react";
import { useQuickAdd } from "@/components/quick-add/quick-add-provider";
import { cn } from "@/lib/cn";

const HIDDEN_ON = ["/login", "/offline"];

const ITEMS = [
  { href: "/hoy", label: "Hoy", icon: CalendarCheck },
  { href: "/horario", label: "Semana", icon: CalendarRange },
  { href: "/gimnasio", label: "Gimnasio", icon: Dumbbell },
  { href: "/mas", label: "Más", icon: Menu },
] as const;

/** Barra inferior al alcance del pulgar, con el "+" de captura rápida al centro. */
export function BottomNav() {
  const pathname = usePathname();
  const { open } = useQuickAdd();

  if (HIDDEN_ON.some((path) => pathname.startsWith(path))) return null;

  const isActive = (href: string) =>
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    (href === "/mas" && pathname.startsWith("/materias")) ||
    (href === "/hoy" && pathname.startsWith("/habitos"));

  const renderItem = ({ href, label, icon: Icon }: (typeof ITEMS)[number]) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "pressable flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
          active ? "text-primary" : "text-muted"
        )}
      >
        <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-primary-soft")}>
          <Icon size={21} strokeWidth={active ? 2.4 : 2} aria-hidden />
        </span>
        {label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-lg items-center px-2">
        {ITEMS.slice(0, 2).map(renderItem)}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={() => open()}
            aria-label="Agregar rápido"
            className="pressable -mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-on-accent ring-4 ring-canvas"
          >
            <Plus size={28} strokeWidth={2.6} aria-hidden />
          </button>
        </div>
        {ITEMS.slice(2).map(renderItem)}
      </div>
    </nav>
  );
}
