import "server-only";
import webpush from "web-push";
import type { PushPayload } from "./reminder-payload";

export type StoredSubscription = { endpoint: string; p256dh: string; auth: string };

/** "gone": el navegador ya no acepta avisos en esa suscripción (se desinstaló o se quitó el permiso). */
export type SendResult = "sent" | "gone" | "error";

let configured = false;

function configure() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("Faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY o VAPID_SUBJECT.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function sendPush(subscription: StoredSubscription, payload: PushPayload): Promise<SendResult> {
  configure();
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload),
      // Si el celular está apagado más de 12 h, el aviso ya no sirve.
      { TTL: 12 * 60 * 60, urgency: "high" }
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("Error al mandar push", status, (error as Error).message);
    return "error";
  }
}
