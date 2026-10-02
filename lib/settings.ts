import { isWeightUnit, type WeightUnit } from "./units";

export type Theme = "system" | "light" | "dark";

export type Settings = { weightUnit: WeightUnit; theme: Theme };

export const DEFAULT_SETTINGS: Settings = { weightUnit: "kg", theme: "system" };

/**
 * Copia de los ajustes en una cookie: el layout la lee en cada request sin ir a la base, y así
 * el tema se pinta desde el primer HTML (sin parpadeo). La fuente de verdad es `user_settings`.
 */
export const SETTINGS_COOKIE = "life-os-settings";

export function isTheme(value: unknown): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

export function serializeSettings(settings: Settings): string {
  return `${settings.weightUnit}.${settings.theme}`;
}

export function parseSettings(raw: string | undefined | null): Settings | null {
  if (!raw) return null;
  const [weightUnit, theme] = raw.split(".");
  if (!isWeightUnit(weightUnit) || !isTheme(theme)) return null;
  return { weightUnit, theme };
}
