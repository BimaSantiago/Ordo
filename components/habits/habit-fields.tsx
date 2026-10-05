"use client";

import { Chip } from "@/components/ui/chip";
import { WEEKDAY_LABELS } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { HabitInput } from "@/app/hoy/actions";

export type HabitDraft = Omit<HabitInput, "id">;

export const EMPTY_HABIT: HabitDraft = {
  name: "",
  frequency: "diaria",
  frequencyDays: null,
  targetCount: null,
  unit: null,
};

// Lunes primero, como el resto de la app.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Campos de un hábito: nombre, sí/no o meta numérica, y todos los días o ciertos días. */
export function HabitFields({
  value,
  onChange,
  autoFocus = false,
}: {
  value: HabitDraft;
  onChange: (value: HabitDraft) => void;
  autoFocus?: boolean;
}) {
  const isNumeric = value.targetCount != null;
  const days = value.frequencyDays ?? [];

  function toggleDay(day: number) {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    onChange({ ...value, frequencyDays: next });
  }

  return (
    <div className="space-y-4">
      <input
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        placeholder="p. ej. Leer 20 minutos, Tomar agua"
        aria-label="Nombre del hábito"
        enterKeyHint="done"
        autoFocus={autoFocus}
        className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-lg font-medium outline-none focus:border-primary"
      />

      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted">Tipo</p>
        <div className="flex gap-2">
          <Chip selected={!isNumeric} onClick={() => onChange({ ...value, targetCount: null, unit: null })}>
            Sí / No
          </Chip>
          <Chip selected={isNumeric} onClick={() => onChange({ ...value, targetCount: value.targetCount ?? 8 })}>
            Meta numérica
          </Chip>
        </div>
        {isNumeric && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={value.targetCount ?? ""}
              onChange={(e) => onChange({ ...value, targetCount: e.target.value === "" ? 1 : Math.max(1, Math.floor(Number(e.target.value))) })}
              aria-label="Meta al día"
              className="min-h-12 w-24 rounded-xl border border-line bg-surface px-3 text-center text-lg font-semibold outline-none focus:border-primary"
            />
            <input
              value={value.unit ?? ""}
              onChange={(e) => onChange({ ...value, unit: e.target.value })}
              placeholder="unidad (vasos, páginas…)"
              aria-label="Unidad de la meta"
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary"
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted">¿Cuándo?</p>
        <div className="flex gap-2">
          <Chip selected={value.frequency === "diaria"} onClick={() => onChange({ ...value, frequency: "diaria", frequencyDays: null })}>
            Todos los días
          </Chip>
          <Chip
            selected={value.frequency === "dias_semana"}
            onClick={() => onChange({ ...value, frequency: "dias_semana", frequencyDays: days.length ? days : [1, 3, 5] })}
          >
            Ciertos días
          </Chip>
        </div>
        {value.frequency === "dias_semana" && (
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_ORDER.map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={days.includes(day)}
                aria-label={WEEKDAY_LABELS[day]}
                onClick={() => toggleDay(day)}
                className={cn(
                  "pressable min-h-11 rounded-xl border text-sm font-semibold",
                  days.includes(day) ? "border-primary bg-primary text-on-primary" : "border-line bg-surface"
                )}
              >
                {WEEKDAY_LABELS[day].slice(0, 2)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function isHabitDraftValid(draft: HabitDraft): boolean {
  if (!draft.name.trim()) return false;
  if (draft.frequency === "dias_semana" && (draft.frequencyDays ?? []).length === 0) return false;
  return draft.targetCount == null || draft.targetCount >= 1;
}
