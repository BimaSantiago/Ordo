"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireUserId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No autenticado");
  return { supabase, userId: data.user.id };
}

export type BlockInput = {
  /** UUID del cliente: el mismo id crea o actualiza (editar directo en la tabla). */
  id: string;
  categoryId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  notes: string | null;
};

export type BlockResult = { ok: true } | { ok: false; error: string };

export async function saveBlock(input: BlockInput): Promise<BlockResult> {
  if (!input.categoryId) return { ok: false, error: "Elige una materia o actividad." };
  if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    return { ok: false, error: "Día inválido." };
  }
  if (!input.startTime || !input.endTime || input.endTime <= input.startTime) {
    return { ok: false, error: "La hora de fin debe ser después del inicio." };
  }

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("schedule_blocks").upsert({
    id: input.id,
    user_id: userId,
    category_id: input.categoryId,
    day_of_week: input.dayOfWeek,
    start_time: input.startTime,
    end_time: input.endTime,
    notes: input.notes?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/horario");
  revalidatePath("/hoy");
  return { ok: true };
}

export async function deleteBlock(blockId: string): Promise<BlockResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("schedule_blocks").delete().eq("id", blockId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/horario");
  revalidatePath("/hoy");
  return { ok: true };
}
