"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadSettingsFromDb, writeSettingsCookie } from "@/lib/settings-server";

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // En un dispositivo nuevo, traer unidad y tema guardados para pintar bien desde el inicio.
  await writeSettingsCookie(await loadSettingsFromDb(supabase));

  redirect("/hoy");
}
