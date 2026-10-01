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

export async function createCustomExercise(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  const primaryMuscleGroup = (formData.get("primary_muscle_group") as string)?.trim() || null;
  const equipment = (formData.get("equipment") as string)?.trim() || null;

  const { supabase, userId } = await requireUserId();
  await supabase.from("exercises").insert({
    id: randomUUID(),
    user_id: userId,
    name,
    primary_muscle_group: primaryMuscleGroup,
    equipment,
    is_custom: true,
  });

  revalidatePath("/gimnasio/ejercicios");
}

export async function deleteCustomExercise(exerciseId: string) {
  const { supabase } = await requireUserId();
  await supabase.from("exercises").delete().eq("id", exerciseId);

  revalidatePath("/gimnasio/ejercicios");
}
