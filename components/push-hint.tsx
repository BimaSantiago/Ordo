"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentSubscription, getPushSupport } from "@/lib/push/client";

/** Aviso en el panel "+" cuando se elige un recordatorio pero este dispositivo no recibe notificaciones. */
export function PushHint() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Sin soporte (p. ej. http://IP-local) no se insiste: la pantalla de Recordatorios lo explica.
    if (getPushSupport() !== "ok") return;
    void getCurrentSubscription().then((subscription) => {
      if (!cancelled) setEnabled(Boolean(subscription) && Notification.permission === "granted");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (enabled) return null;
  return (
    <p className="mt-1 text-xs text-muted">
      Este dispositivo no recibe avisos.{" "}
      <Link href="/mas/recordatorios" className="font-semibold text-primary underline">
        Activar notificaciones
      </Link>
    </p>
  );
}
