"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/tareas/actions";

export type ProjectStatus = "activo" | "pausado" | "terminado" | "archivado";
const STATUSES: ProjectStatus[] = ["activo", "pausado", "terminado", "archivado"];

async function requireUserId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No autenticado");
  return { supabase, userId: data.user.id };
}

function revalidateProjects() {
  revalidatePath("/proyectos", "layout");
  revalidatePath("/notas");
  revalidatePath("/revision");
}

/** Crea o actualiza (id del cliente). Solo cambia los campos que se mandan. */
export async function saveProject(input: {
  id: string;
  name?: string;
  status?: ProjectStatus;
  description?: string;
  nextSteps?: string;
}): Promise<ActionResult> {
  if (input.name !== undefined && !input.name.trim()) return { ok: false, error: "Escribe un nombre." };
  if (input.status !== undefined && !STATUSES.includes(input.status)) return { ok: false, error: "Estado inválido." };

  const { supabase, userId } = await requireUserId();
  const fields = {
    ...(input.name !== undefined && { name: input.name.trim() }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.description !== undefined && { description: input.description.trim() || null }),
    ...(input.nextSteps !== undefined && { next_steps: input.nextSteps.trim() || null }),
  };

  const { data: existing } = await supabase.from("projects").select("id").eq("id", input.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("projects").update(fields).eq("id", input.id)
    : await supabase.from("projects").insert({ id: input.id, user_id: userId, name: input.name?.trim() ?? "Proyecto", ...fields });
  if (error) return { ok: false, error: error.message };
  revalidateProjects();
  return { ok: true };
}

/** Borra el proyecto; sus tareas, notas e ideas se quedan sin proyecto (on delete set null). */
export async function deleteProject(input: { id: string }): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("projects").delete().eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidateProjects();
  return { ok: true };
}
