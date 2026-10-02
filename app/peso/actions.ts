"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/tareas/actions";

// Idempotentes (id/fecha del cliente): se pueden reintentar desde la cola sin conexión.
// Guardar peso vive en app/hoy/actions.ts (saveWeight) porque también se captura desde el "+".

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function requireUserId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No autenticado");
  return { supabase, userId: data.user.id };
}

function revalidateBody() {
  revalidatePath("/peso");
  revalidatePath("/hoy");
  revalidatePath("/gimnasio/progreso", "layout");
}

export async function deleteWeight(input: { localDate: string }): Promise<ActionResult> {
  if (!DATE_RE.test(input.localDate)) return { ok: false, error: "Fecha inválida." };
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("body_weight_logs").delete().eq("local_date", input.localDate);
  if (error) return { ok: false, error: error.message };
  revalidateBody();
  return { ok: true };
}

export async function saveMeasurement(input: {
  id: string;
  localDate: string;
  type: string;
  value: number;
}): Promise<ActionResult> {
  const type = input.type.trim().toLowerCase();
  if (!type) return { ok: false, error: "Elige qué mediste." };
  if (!DATE_RE.test(input.localDate)) return { ok: false, error: "Fecha inválida." };
  if (!Number.isFinite(input.value) || input.value <= 0 || input.value > 999) {
    return { ok: false, error: "Medida inválida." };
  }

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("body_measurements").upsert({
    id: input.id,
    user_id: userId,
    local_date: input.localDate,
    type,
    value: Math.round(input.value * 100) / 100,
  });
  if (error) return { ok: false, error: error.message };
  revalidateBody();
  return { ok: true };
}

export async function deleteMeasurement(input: { id: string }): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("body_measurements").delete().eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidateBody();
  return { ok: true };
}
