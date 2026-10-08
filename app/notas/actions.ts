"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/tareas/actions";

// Notas e ideas pasan por la cola sin conexión (runOrQueue): ids del cliente y upsert.

async function requireUserId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No autenticado");
  return { supabase, userId: data.user.id };
}

function revalidateNotes() {
  revalidatePath("/notas");
  revalidatePath("/proyectos", "layout");
  revalidatePath("/hoy");
}

export async function saveNote(input: {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  projectId: string | null;
}): Promise<ActionResult> {
  const body = input.body.trim();
  if (!body) return { ok: false, error: "La nota está vacía." };

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("notes").upsert({
    id: input.id,
    user_id: userId,
    title: input.title.trim() || null,
    body,
    pinned: input.pinned,
    project_id: input.projectId,
  });
  if (error) return { ok: false, error: error.message };
  revalidateNotes();
  return { ok: true };
}

export async function setNotePinned(input: { id: string; pinned: boolean }): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("notes").update({ pinned: input.pinned }).eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidateNotes();
  return { ok: true };
}

export async function deleteNote(input: { id: string }): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("notes").delete().eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidateNotes();
  return { ok: true };
}

export async function saveIdea(input: { id: string; title: string; body: string }): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Escribe la idea." };

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase
    .from("ideas")
    .upsert({ id: input.id, user_id: userId, title, body: input.body.trim() || null });
  if (error) return { ok: false, error: error.message };
  revalidateNotes();
  return { ok: true };
}

export async function deleteIdea(input: { id: string }): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("ideas").delete().eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidateNotes();
  return { ok: true };
}

/** Convierte una idea en proyecto (id del proyecto del cliente) y deja la idea ligada a él. */
export async function promoteIdea(input: { ideaId: string; projectId: string }): Promise<ActionResult> {
  const { supabase, userId } = await requireUserId();
  const { data: idea, error: readError } = await supabase
    .from("ideas")
    .select("title, body, project_id")
    .eq("id", input.ideaId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };
  if (!idea) return { ok: false, error: "La idea ya no existe." };
  // Reintento desde la cola: ya se convirtió.
  if (idea.project_id) return { ok: true };

  const { error } = await supabase
    .from("projects")
    .upsert({ id: input.projectId, user_id: userId, name: idea.title, description: idea.body, status: "activo" });
  if (error) return { ok: false, error: error.message };
  const { error: linkError } = await supabase.from("ideas").update({ project_id: input.projectId }).eq("id", input.ideaId);
  if (linkError) return { ok: false, error: linkError.message };

  revalidateNotes();
  return { ok: true };
}
