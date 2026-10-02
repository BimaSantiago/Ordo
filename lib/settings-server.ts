// Solo servidor: usa next/headers (falla si se importa desde un Client Component).
import { cache } from "react";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "./supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, isTheme, parseSettings, serializeSettings, SETTINGS_COOKIE, type Settings } from "./settings";
import { isWeightUnit } from "./units";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Solo desde Server Actions o Route Handlers (los Server Components no pueden escribir cookies). */
export async function writeSettingsCookie(settings: Settings) {
  const cookieStore = await cookies();
  cookieStore.set(SETTINGS_COOKIE, serializeSettings(settings), {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: false,
  });
}

/** Ajustes desde la base (fuente de verdad). Valores por defecto si no hay fila o no hay sesión. */
export async function loadSettingsFromDb(client?: SupabaseClient): Promise<Settings> {
  const supabase = client ?? (await createSupabaseServerClient());
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return DEFAULT_SETTINGS;
  const { data } = await supabase.from("user_settings").select("weight_unit, theme").maybeSingle();
  return {
    weightUnit: isWeightUnit(data?.weight_unit) ? data.weight_unit : DEFAULT_SETTINGS.weightUnit,
    theme: isTheme(data?.theme) ? data.theme : DEFAULT_SETTINGS.theme,
  };
}

/**
 * Ajustes para renderizar: la cookie si existe (rápido). Si no (dispositivo nuevo), la base. La
 * cookie se escribe al guardar ajustes y al iniciar sesión.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  const cookieStore = await cookies();
  return parseSettings(cookieStore.get(SETTINGS_COOKIE)?.value) ?? (await loadSettingsFromDb());
});
