"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isTheme, type Settings } from "@/lib/settings";
import { writeSettingsCookie } from "@/lib/settings-server";
import { isWeightUnit } from "@/lib/units";
import type { ActionResult } from "@/app/tareas/actions";

/** Guarda los ajustes en la base (fuente de verdad) y en la cookie que lee el layout. */
export async function saveSettings(settings: Settings): Promise<ActionResult> {
  if (!isWeightUnit(settings.weightUnit) || !isTheme(settings.theme)) return { ok: false, error: "Ajuste inválido." };

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "No autenticado" };

  const { error } = await supabase.from("user_settings").upsert({
    user_id: data.user.id,
    weight_unit: settings.weightUnit,
    theme: settings.theme,
  });
  if (error) return { ok: false, error: error.message };

  await writeSettingsCookie(settings);
  // Unidad y tema afectan a toda la app.
  revalidatePath("/", "layout");
  return { ok: true };
}
