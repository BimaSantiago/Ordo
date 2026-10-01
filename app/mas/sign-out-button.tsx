"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { clearCachedPages } from "@/components/service-worker-registration";
import { signOut } from "./actions";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          // Primero se borran las pantallas guardadas offline: alguien más podría usar el teléfono.
          await clearCachedPages().catch(() => undefined);
          await signOut();
        })
      }
      className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-semibold text-danger disabled:opacity-50"
    >
      <LogOut size={18} aria-hidden />
      Cerrar sesión
    </button>
  );
}
