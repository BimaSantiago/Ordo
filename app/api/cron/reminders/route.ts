import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildReminderPayload, dueReminderWindow } from "@/lib/push/reminder-payload";
import { sendPush, type StoredSubscription } from "@/lib/push/send";

// Lo llama pg_cron cada minuto (supabase/migrations/00000000000014_recordatorios_cron.sql) con
// `Authorization: Bearer <CRON_SECRET>`. No hay sesión de usuario: el proxy deja pasar /api/cron/
// y aquí se valida el secreto.

type ClaimedTask = {
  id: string;
  user_id: string;
  title: string;
  due_date: string;
  start_time: string | null;
  end_time: string | null;
  schedule_categories: { name: string } | null;
};

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Comparar hashes de igual largo en tiempo constante.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`));
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return new Response("No autorizado", { status: 401 });

  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const { from, to } = dueReminderWindow(now);

  // Reclamar los avisos en un solo UPDATE: si dos ejecuciones se enciman, cada tarea sale una vez.
  const { data, error } = await supabase
    .from("tasks")
    .update({ reminded_at: now.toISOString() })
    .is("reminded_at", null)
    .eq("status", "pendiente")
    .gte("remind_at", from)
    .lte("remind_at", to)
    .select("id, user_id, title, due_date, start_time, end_time, schedule_categories(name)")
    .returns<ClaimedTask[]>();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  const tasks = data ?? [];
  if (tasks.length === 0) return Response.json({ ok: true, tasks: 0 });

  const userIds = [...new Set(tasks.map((task) => task.user_id))];
  const { data: subscriptions, error: subError } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (subError) {
    await supabase.from("tasks").update({ reminded_at: null }).in("id", tasks.map((task) => task.id));
    return Response.json({ ok: false, error: subError.message }, { status: 500 });
  }

  const byUser = new Map<string, StoredSubscription[]>();
  for (const { user_id, ...subscription } of subscriptions ?? []) {
    byUser.set(user_id, [...(byUser.get(user_id) ?? []), subscription]);
  }

  const gone = new Set<string>();
  const retry: string[] = [];
  let sent = 0;

  await Promise.all(
    tasks.map(async (task) => {
      const payload = buildReminderPayload(
        {
          id: task.id,
          title: task.title,
          dueDate: task.due_date,
          startTime: task.start_time,
          endTime: task.end_time,
          categoryName: task.schedule_categories?.name ?? null,
        },
        now
      );
      const results = await Promise.all((byUser.get(task.user_id) ?? []).map((sub) => sendPush(sub, payload)));
      results.forEach((result, i) => {
        if (result === "gone") gone.add(byUser.get(task.user_id)![i].endpoint);
      });
      sent += results.filter((result) => result === "sent").length;
      // Si todo falló por un error pasajero (no "gone"), se reintenta el siguiente minuto.
      if (results.length > 0 && results.every((result) => result === "error")) retry.push(task.id);
    })
  );

  if (retry.length > 0) await supabase.from("tasks").update({ reminded_at: null }).in("id", retry);
  if (gone.size > 0) await supabase.from("push_subscriptions").delete().in("endpoint", [...gone]);

  return Response.json({ ok: true, tasks: tasks.length, sent, gone: gone.size, retry: retry.length });
}
