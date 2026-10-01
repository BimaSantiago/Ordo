import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Contenedor de pantalla: deja espacio para la barra inferior y el área segura del teléfono. */
export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-1 flex-col gap-5 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]",
        wide ? "max-w-5xl" : "max-w-lg"
      )}
    >
      {children}
    </main>
  );
}
