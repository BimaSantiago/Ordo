"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireUserId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No autenticado");
  return { supabase, userId: data.user.id };
}

export async function createBlock(formData: FormData) {
  const categoryId = formData.get("category_id") as string;
  const dayOfWeek = Number(formData.get("day_of_week"));
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!categoryId || !startTime || !endTime || Number.isNaN(dayOfWeek)) return;
  if (endTime <= startTime) return;

  const { supabase, userId } = await requireUserId();
  await supabase.from("schedule_blocks").insert({
    id: randomUUID(),
    user_id: userId,
    category_id: categoryId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    notes,
  });

  revalidatePath("/horario");
  revalidatePath("/hoy");
}

export async function deleteBlock(blockId: string) {
  const { supabase } = await requireUserId();
  await supabase.from("schedule_blocks").delete().eq("id", blockId);

  revalidatePath("/horario");
  revalidatePath("/hoy");
}
