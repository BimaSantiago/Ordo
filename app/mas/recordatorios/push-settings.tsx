"use client";

import { useCallback, useEffect, useState } from "react";
import { BellOff, BellRing, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentSubscription, getPushSupport, subscribeThisDevice, subscriptionToInput, type PushSupport } from "@/lib/push/client";
import { deletePushSubscription, savePushSubscription, sendTestNotification } from "./actions";

type Status =
  | { kind: "loading" }
  | { kind: "unavailable"; reason: Exclude<PushSupport, "ok"> }
  | { kind: "denied" }
  | { kind: "off" }
  | { kind: "on"; subscription: PushSubscription };

const UNAVAILABLE: Record<Exclude<PushSupport, "ok">, string> = {
  insecure: "Las notificaciones solo funcionan con HTTPS. Abre la app desde su dominio (o instalada), no desde la IP de la PC.",
  unsupported: "Este navegador no permite notificaciones push. En Android usa Chrome; en iPhone, instala la app en la pantalla de inicio.",
  "no-key": "Falta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY en las variables de entorno.",
};

export function PushSettings() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const support = getPushSupport();
    if (support !== "ok") return setStatus({ kind: "unavailable", reason: support });
    if (Notification.permission === "denied") return setStatus({ kind: "denied" });
    const subscription = await getCurrentSubscription();
    if (!subscription) return setStatus({ kind: "off" });
    setStatus({ kind: "on", subscription });
    // Por si la fila se borró en el servidor (p. ej. otro dispositivo la marcó como vencida).
    void savePushSubscription(subscriptionToInput(subscription));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  async function enable() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await subscribeThisDevice();
      if (typeof result === "string") {
        setStatus(result === "denied" ? { kind: "denied" } : { kind: "off" });
        return;
      }
      const saved = await savePushSubscription(subscriptionToInput(result));
      if (!saved.ok) {
        await result.unsubscribe();
        return setError(saved.error);
      }
      setStatus({ kind: "on", subscription: result });
    } catch (subscribeError) {
      setError(`No se pudieron activar: ${(subscribeError as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function disable(subscription: PushSubscription) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await deletePushSubscription(subscription.endpoint);
    if (!result.ok) {
      setBusy(false);
      return setError(result.error);
    }
    await subscription.unsubscribe().catch(() => undefined);
    setBusy(false);
    setStatus({ kind: "off" });
  }

  async function test(subscription: PushSubscription) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await sendTestNotification(subscription.endpoint);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setNotice("Prueba enviada. Debe llegar en unos segundos.");
  }

  return (
    <div className="space-y-3">
      {status.kind === "loading" && <Card className="h-32 animate-pulse" />}

      {status.kind === "unavailable" && (
        <Card className="flex items-start gap-3 p-4">
          <BellOff size={24} className="mt-0.5 shrink-0 text-muted" aria-hidden />
          <p className="text-sm text-muted">{UNAVAILABLE[status.reason]}</p>
        </Card>
      )}

      {status.kind === "denied" && (
        <Card className="flex items-start gap-3 p-4">
          <BellOff size={24} className="mt-0.5 shrink-0 text-danger" aria-hidden />
          <div>
            <p className="font-semibold">Notificaciones bloqueadas</p>
            <p className="text-sm text-muted">
              Las bloqueaste para este sitio. Permítelas desde el candado junto a la dirección (o en Ajustes del
              celular → Apps → Chrome → Notificaciones) y vuelve a abrir esta pantalla.
            </p>
          </div>
        </Card>
      )}

      {status.kind === "off" && (
        <Card className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <BellOff size={24} className="mt-0.5 shrink-0 text-muted" aria-hidden />
            <div>
              <p className="font-semibold">Desactivadas en este dispositivo</p>
              <p className="text-sm text-muted">
                Actívalas para recibir el aviso de tus tareas aunque la app esté cerrada. Hazlo en cada dispositivo
                donde quieras recibirlos.
              </p>
            </div>
          </div>
          <Button block onClick={() => void enable()} disabled={busy}>
            Activar notificaciones
          </Button>
        </Card>
      )}

      {status.kind === "on" && (
        <Card className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <BellRing size={24} className="mt-0.5 shrink-0 text-success" aria-hidden />
            <div>
              <p className="font-semibold">Activadas en este dispositivo</p>
              <p className="text-sm text-muted">Los avisos llegan a la hora elegida, con un margen de un minuto.</p>
            </div>
          </div>
          <Button variant="secondary" block onClick={() => void test(status.subscription)} disabled={busy}>
            <Send size={18} aria-hidden />
            Enviar prueba
          </Button>
          <Button variant="ghost" block onClick={() => void disable(status.subscription)} disabled={busy}>
            Desactivar en este dispositivo
          </Button>
        </Card>
      )}

      {notice && (
        <p role="status" className="rounded-xl bg-primary-soft px-3 py-2 text-sm text-primary">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
