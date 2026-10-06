"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireUserId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No autenticado");
  return { supabase, userId: data.user.id };
}

export type TaskInput = {
  /** UUID generado en el cliente (sección 6 de CLAUDE.md: permite crear sin conexión después). */
  id: string;
  title: string;
  dueDate: string;
  categoryId: string | null;
  startTime: string | null;
  endTime: string | null;
  remindAt: string | null;
  /** Proyecto al que pertenece. Si no se manda (undefined), se conserva el que ya tenía. */
  projectId?: string | null;
};

export type ActionResult = { ok: true } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

function validate(input: TaskInput): string | null {
  if (!input.title.trim()) return "Escribe un título.";
  if (!DATE_RE.test(input.dueDate)) return "Fecha inválida.";
  if (input.startTime && !TIME_RE.test(input.startTime)) return "Hora inválida.";
  if (input.endTime) {
    if (!input.startTime || !TIME_RE.test(input.endTime)) return "Hora de fin inválida.";
    if (input.endTime <= input.startTime) return "La hora de fin debe ser después del inicio.";
  }
  return null;
}

function revalidateTaskViews() {
  revalidatePath("/hoy");
  revalidatePath("/horario");
  revalidatePath("/proyectos", "layout");
}

/** Crea o actualiza (mismo id) una tarea; con `startTime` es una "actividad" en la tabla semanal. */
export async function saveTask(input: TaskInput): Promise<ActionResult> {
  const error = validate(input);
  if (error) return { ok: false, error };

  const { supabase, userId } = await requireUserId();
  const { error: dbError } = await supabase.from("tasks").upsert({
    id: input.id,
    user_id: userId,
    title: input.title.trim(),
    due_date: input.dueDate,
    category_id: input.categoryId,
    start_time: input.startTime,
    end_time: input.startTime ? input.endTime : null,
    remind_at: input.remindAt,
    ...(input.projectId !== undefined && { project_id: input.projectId }),
  });
  if (dbError) return { ok: false, error: dbError.message };

  revalidateTaskViews();
  return { ok: true };
}

export async function toggleTask(taskId: string, completed: boolean): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: completed ? "completada" : "pendiente",
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateTaskViews();
  return { ok: true };
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateTaskViews();
  return { ok: true };
}
