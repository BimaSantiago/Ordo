"use client";

import { useState, useTransition } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { useSettings } from "@/components/settings-provider";
import type { Settings, Theme } from "@/lib/settings";
import type { WeightUnit } from "@/lib/units";
import { saveSettings } from "./actions";

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
];

export function SettingsForm() {
  const current = useSettings();
  const [settings, setSettings] = useState<Settings>(current);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(next: Settings) {
    const previous = settings;
    setSettings(next);
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveSettings(next);
        if (!result.ok) {
          setSettings(previous);
          setError(result.error);
        }
      } catch {
        setSettings(previous);
        setError("Sin conexión: los ajustes se cambian con señal.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <SectionTitle>Unidad de peso</SectionTitle>
        <Card className="space-y-2 p-3">
          <div className="flex gap-2">
            {(["kg", "lb"] as WeightUnit[]).map((unit) => (
              <Chip
                key={unit}
                selected={settings.weightUnit === unit}
                disabled={isPending}
                onClick={() => update({ ...settings, weightUnit: unit })}
              >
                {unit === "kg" ? "Kilogramos (kg)" : "Libras (lb)"}
              </Chip>
            ))}
          </div>
          <p className="text-xs text-muted">
            Se usa en el gimnasio y en el peso corporal. Todo se guarda en kg, así que puedes cambiar cuando quieras sin perder
            precisión.
          </p>
        </Card>
      </section>

      <section className="space-y-2">
        <SectionTitle>Tema</SectionTitle>
        <Card className="space-y-2 p-3">
          <div className="flex flex-wrap gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <Chip
                key={value}
                selected={settings.theme === value}
                disabled={isPending}
                onClick={() => update({ ...settings, theme: value })}
              >
                <Icon size={16} aria-hidden />
                {label}
              </Chip>
            ))}
          </div>
          <p className="text-xs text-muted">&quot;Sistema&quot; sigue el modo claro u oscuro de tu teléfono.</p>
        </Card>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
