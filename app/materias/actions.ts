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

export async function createCategory(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  const color = (formData.get("color") as string) || "#64748b";
  const type = (formData.get("type") as string) === "escuela" ? "escuela" : "actividad";

  const { supabase, userId } = await requireUserId();
  await supabase.from("schedule_categories").insert({
    id: randomUUID(),
    user_id: userId,
    name,
    color,
    type,
  });

  revalidatePath("/materias");
  revalidatePath("/horario");
  revalidatePath("/hoy");
}

export async function setCategoryArchived(categoryId: string, archived: boolean) {
  const { supabase } = await requireUserId();
  await supabase.from("schedule_categories").update({ archived }).eq("id", categoryId);

  revalidatePath("/materias");
  revalidatePath("/horario");
  revalidatePath("/hoy");
}

export async function deleteCategory(categoryId: string) {
  const { supabase } = await requireUserId();
  await supabase.from("schedule_categories").delete().eq("id", categoryId);

  revalidatePath("/materias");
  revalidatePath("/horario");
  revalidatePath("/hoy");
}
