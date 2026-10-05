"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";

const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS);

/** Ajustes (unidad de peso, tema) para Client Components; el layout los lee en el servidor. */
export function SettingsProvider({ settings, children }: { settings: Settings; children: ReactNode }) {
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  return useContext(SettingsContext);
}
