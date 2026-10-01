"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/tareas/actions";

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

export type QuickCategory = { id: string; name: string; color: string };

/** Materias activas para los selectores del panel rápido (se piden al abrirlo). */
export async function listActiveCategories(): Promise<QuickCategory[]> {
  const { supabase } = await requireUserId();
  const { data } = await supabase
    .from("schedule_categories")
    .select("id, name, color")
    .eq("archived", false)
    .order("name", { ascending: true });
  return data ?? [];
}

/**
 * Crea una materia desde el panel rápido o la tabla. El id viene del cliente para poder
 * seleccionarla al momento y reintentarla desde la cola sin conexión sin duplicarla.
 */
export async function createCategoryQuick(category: QuickCategory): Promise<ActionResult> {
  const name = category.name.trim();
  if (!name) return { ok: false, error: "Escribe un nombre." };
  const color = /^#[0-9a-fA-F]{6}$/.test(category.color) ? category.color : "#64748b";

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("schedule_categories")
    .upsert({ id: category.id, name, color, user_id: userId });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/materias");
  revalidatePath("/horario");
  revalidatePath("/hoy");
  return { ok: true };
}

export async function updateCategory(categoryId: string, input: { name: string; color: string; type: string }) {
  const name = input.name.trim();
  if (!name) return;
  const { supabase } = await requireUserId();
  await supabase
    .from("schedule_categories")
    .update({
      name,
      color: /^#[0-9a-fA-F]{6}$/.test(input.color) ? input.color : "#64748b",
      type: input.type === "escuela" ? "escuela" : "actividad",
    })
    .eq("id", categoryId);

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
