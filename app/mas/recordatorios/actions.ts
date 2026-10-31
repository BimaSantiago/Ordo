"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/push/send";
import type { ActionResult } from "@/app/tareas/actions";

export type SubscriptionInput = { endpoint: string; p256dh: string; auth: string; userAgent: string | null };

async function requireUserId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No autenticado");
  return { supabase, userId: data.user.id };
}

/** Guarda (o refresca) la suscripción de este dispositivo; el endpoint lo identifica. */
export async function savePushSubscription(input: SubscriptionInput): Promise<ActionResult> {
  if (!input.endpoint.startsWith("https://") || !input.p256dh || !input.auth) {
    return { ok: false, error: "Suscripción inválida." };
  }
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent?.slice(0, 300) ?? null,
    },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/mas/recordatorios");
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/mas/recordatorios");
  return { ok: true };
}

/** Manda una notificación de prueba solo a este dispositivo. */
export async function sendTestNotification(endpoint: string): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Este dispositivo no está registrado. Vuelve a activar las notificaciones." };

  let result;
  try {
    result = await sendPush(data, {
      title: "Recordatorios activados",
      body: "Así se verán los avisos de tus tareas.",
      url: "/mas/recordatorios",
      tag: "test",
    });
  } catch (sendError) {
    return { ok: false, error: (sendError as Error).message };
  }
  if (result === "gone") {
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    revalidatePath("/mas/recordatorios");
    return { ok: false, error: "El navegador ya no acepta avisos aquí. Vuelve a activarlos." };
  }
  if (result === "error") return { ok: false, error: "No se pudo mandar la prueba. Intenta de nuevo." };
  return { ok: true };
}
