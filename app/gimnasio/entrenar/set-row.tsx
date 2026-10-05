"use client";

import { Check, X } from "lucide-react";
import { SET_TYPE_LABELS, type DraftSet, type SetType } from "@/lib/gimnasio/workout-draft";
import { cn } from "@/lib/cn";
import { useSettings } from "@/components/settings-provider";
import { toInputValue, toKg } from "@/lib/units";

const INPUT = "min-h-11 rounded-lg border border-line bg-surface px-1.5 text-center tabular-nums outline-none focus:border-primary";

export function SetRow({
  set,
  onChange,
  onRemove,
}: {
  set: DraftSet;
  onChange: (set: DraftSet) => void;
  onRemove: () => void;
}) {
  const { weightUnit } = useSettings();
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-xl border px-1.5 py-1",
        set.completed ? "border-success/40 bg-success-soft" : "border-line bg-surface"
      )}
    >
      <select
        value={set.setType}
        onChange={(e) => onChange({ ...set, setType: e.target.value as SetType })}
        aria-label="Tipo de serie"
        className="min-h-11 w-14 shrink-0 rounded-lg border border-line bg-surface px-1 text-xs"
      >
        {Object.entries(SET_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input
        type="number"
        inputMode="decimal"
        placeholder={weightUnit}
        aria-label={`Peso en ${weightUnit}`}
        // Se captura en la unidad del usuario y se guarda en kg.
        value={toInputValue(set.weightKg, weightUnit)}
        onChange={(e) =>
          onChange({ ...set, weightKg: e.target.value === "" ? null : toKg(Number(e.target.value), weightUnit) })
        }
        className={cn(INPUT, "w-16")}
      />
      <input
        type="number"
        inputMode="numeric"
        placeholder="reps"
        aria-label="Repeticiones"
        value={set.reps ?? ""}
        onChange={(e) => onChange({ ...set, reps: e.target.value === "" ? null : Number(e.target.value) })}
        className={cn(INPUT, "w-14")}
      />
      <input
        type="number"
        inputMode="decimal"
        placeholder="RPE"
        aria-label="RPE (opcional)"
        value={set.rpe ?? ""}
        onChange={(e) => onChange({ ...set, rpe: e.target.value === "" ? null : Number(e.target.value) })}
        className={cn(INPUT, "w-12")}
      />
      <button
        type="button"
        onClick={() => onChange({ ...set, completed: !set.completed })}
        aria-pressed={set.completed}
        aria-label={set.completed ? "Serie completada, desmarcar" : "Marcar serie completada"}
        className={cn(
          "pressable ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          set.completed ? "bg-success text-on-primary" : "bg-surface-2 text-muted"
        )}
      >
        <Check size={22} strokeWidth={3} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar serie"
        className="pressable flex h-11 w-8 shrink-0 items-center justify-center text-muted"
      >
        <X size={18} aria-hidden />
      </button>
    </div>
  );
}
