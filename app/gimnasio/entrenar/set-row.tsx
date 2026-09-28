"use client";

import type { DraftSet, SetType } from "@/lib/gimnasio/workout-draft";

const SET_TYPE_LABELS: Record<SetType, string> = {
  calentamiento: "Calentamiento",
  normal: "Normal",
  al_fallo: "Al fallo",
  drop_set: "Drop set",
};

export function SetRow({
  set,
  onChange,
  onRemove,
}: {
  set: DraftSet;
  onChange: (set: DraftSet) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${
        set.completed ? "border-emerald-300 bg-emerald-50" : "border-slate-200"
      }`}
    >
      <select
        value={set.setType}
        onChange={(e) => onChange({ ...set, setType: e.target.value as SetType })}
        className="rounded border border-slate-300 bg-white px-1 py-1 text-xs"
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
        placeholder="kg"
        value={set.weightKg ?? ""}
        onChange={(e) => onChange({ ...set, weightKg: e.target.value === "" ? null : Number(e.target.value) })}
        className="w-16 rounded border border-slate-300 px-1.5 py-1 text-base"
      />
      <input
        type="number"
        inputMode="numeric"
        placeholder="reps"
        value={set.reps ?? ""}
        onChange={(e) => onChange({ ...set, reps: e.target.value === "" ? null : Number(e.target.value) })}
        className="w-14 rounded border border-slate-300 px-1.5 py-1 text-base"
      />
      <input
        type="number"
        inputMode="decimal"
        placeholder="RPE"
        value={set.rpe ?? ""}
        onChange={(e) => onChange({ ...set, rpe: e.target.value === "" ? null : Number(e.target.value) })}
        className="w-12 rounded border border-slate-300 px-1 py-1 text-xs"
      />
      <button
        type="button"
        onClick={() => onChange({ ...set, completed: !set.completed })}
        aria-label="Marcar serie completada"
        className={`ml-auto h-9 w-9 shrink-0 rounded-full text-lg ${
          set.completed ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
        }`}
      >
        ✓
      </button>
      <button type="button" onClick={onRemove} className="text-xs text-red-400">
        ✕
      </button>
    </div>
  );
}
