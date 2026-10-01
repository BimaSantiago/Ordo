"use client";

import { usePathname } from "next/navigation";
import { AlertTriangle, CloudOff, RefreshCw, X } from "lucide-react";
import { useSync } from "./sync-provider";

const HIDDEN_ON = ["/login"];

/** Aviso fijo arriba: sin señal, cambios pendientes, sincronizando o cambios rechazados. */
export function ConnectionStatus() {
  const pathname = usePathname();
  const { online, pending, syncing, rejected, dismissRejected, syncNow } = useSync();

  if (HIDDEN_ON.some((path) => pathname.startsWith(path))) return null;

  if (rejected.length > 0) {
    return (
      <div role="alert" className="sticky top-0 z-30 flex items-start gap-2 bg-danger-soft px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-sm text-danger">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
        <p className="flex-1">
          No se pudo guardar: {rejected.map((r) => `${r.item.label} (${r.error})`).join(" · ")}
        </p>
        <button type="button" onClick={dismissRejected} aria-label="Cerrar aviso" className="pressable -m-2 p-2">
          <X size={16} aria-hidden />
        </button>
      </div>
    );
  }

  if (online && pending === 0) return null;

  const label = !online
    ? pending > 0
      ? `Sin conexión · ${pending} ${pending === 1 ? "cambio pendiente" : "cambios pendientes"}`
      : "Sin conexión · lo que registres se guardará en el teléfono"
    : syncing
      ? "Sincronizando…"
      : `${pending} ${pending === 1 ? "cambio pendiente" : "cambios pendientes"}`;

  return (
    <div
      role="status"
      className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-surface-2 px-4 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] text-xs font-semibold text-muted"
    >
      {online ? <RefreshCw size={14} className={syncing ? "animate-spin" : ""} aria-hidden /> : <CloudOff size={14} aria-hidden />}
      <span>{label}</span>
      {online && !syncing && pending > 0 && (
        <button type="button" onClick={syncNow} className="pressable font-bold text-primary">
          Reintentar
        </button>
      )}
    </div>
  );
}
