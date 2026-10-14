"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Pencil, Plus, Target } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { NutritionChart } from "@/components/nutrition/nutrition-chart";
import { useQuickAdd } from "@/components/quick-add/quick-add-provider";
import { useSettings } from "@/components/settings-provider";
import { saveNutritionGoals } from "./actions";
import { formatShortDate } from "@/lib/date";
import { fromKg, roundTo } from "@/lib/units";
import type { DatedValue } from "@/lib/body/trend";
import {
  averagesLastDays,
  goalPercent,
  kcalStatus,
  NUTRITION_FIELDS,
  nutritionWeightSeries,
  parseQuantity,
  type NutritionDay,
  type NutritionField,
  type NutritionGoals,
} from "@/lib/nutrition/summary";
import { cn } from "@/lib/cn";

const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

const RANGES = [
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
  { label: "Todo", days: null },
] as const;

const METRICS = [
  { value: "kcal", label: "Calorías" },
  { value: "proteinG", label: "Proteína" },
] as const;

function format(value: number | null, unit: string) {
  return value == null ? "—" : `${number.format(value)} ${unit}`;
}

export function NutritionPanel({
  days,
  goals,
  weights: weightsKg,
  today,
}: {
  days: NutritionDay[];
  goals: NutritionGoals;
  weights: DatedValue[];
  today: string;
}) {
  const { open } = useQuickAdd();
  const { weightUnit } = useSettings();
  const [range, setRange] = useState<number | null>(30);
  const [metric, setMetric] = useState<"kcal" | "proteinG">("kcal");
  const [showAll, setShowAll] = useState(false);
  const [editingGoals, setEditingGoals] = useState(false);

  const todayEntry = days.find((d) => d.localDate === today) ?? null;
  const week = averagesLastDays(days, 7, today);
  const month = averagesLastDays(days, 30, today);
  const weights = weightsKg.map((w) => ({ ...w, value: roundTo(fromKg(w.value, weightUnit), 1) }));
  const series = nutritionWeightSeries(days, weights, range, today);
  const history = [...days].reverse();
  const hasGoals = NUTRITION_FIELDS.some(({ field }) => goals[field] != null);

  return (
    <>
      <section className="space-y-2">
        <SectionTitle
          action={
            <button
              type="button"
              onClick={() => open({ tab: "comida", nutritionDate: today })}
              className="pressable inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-primary"
            >
              {todayEntry ? <Pencil size={14} aria-hidden /> : <Plus size={16} aria-hidden />}
              {todayEntry ? "Corregir" : "Registrar"}
            </button>
          }
        >
          Hoy
        </SectionTitle>
        <Card className="space-y-3 p-3">
          <MacroBar label="Calorías" unit="kcal" value={todayEntry?.kcal ?? null} goal={goals.kcal} large />
          <div className="grid grid-cols-3 gap-3">
            {NUTRITION_FIELDS.slice(1).map(({ field, label, unit }) => (
              <MacroBar key={field} label={label} unit={unit} value={todayEntry?.[field] ?? null} goal={goals[field]} />
            ))}
          </div>
          {!todayEntry && <p className="text-xs text-muted">Al terminar el día, copia los totales de Fitia con el +.</p>}
        </Card>
      </section>

      <section className="space-y-2">
        <SectionTitle>Promedio diario</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="kcal · 7 días" value={week.kcal == null ? "—" : number.format(week.kcal)} hint={`30 días: ${format(month.kcal, "")}`} />
          <Stat
            label="proteína · 7 días"
            value={week.proteinG == null ? "—" : `${number.format(week.proteinG)} g`}
            hint={`30 días: ${format(month.proteinG, "g")}`}
          />
          <Stat label="registrados" value={`${week.daysLogged}/${week.totalDays}`} hint={`30 días: ${month.daysLogged}/${month.totalDays}`} />
        </div>
      </section>

      <Card className="space-y-2 p-3">
        <div className="flex flex-wrap gap-2">
          {METRICS.map((m) => (
            <Chip key={m.value} selected={metric === m.value} onClick={() => setMetric(m.value)}>
              {m.label}
            </Chip>
          ))}
        </div>
        <NutritionChart points={series} metric={metric} goal={goals[metric]} weightUnit={weightUnit} />
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {RANGES.map((r) => (
            <Chip key={r.label} selected={range === r.days} onClick={() => setRange(r.days)}>
              {r.label}
            </Chip>
          ))}
        </div>
        <p className="text-xs text-muted">
          Barras: {metric === "kcal" ? "calorías" : "proteína"} por día{goals[metric] != null && " (punteada: tu meta)"}. Línea:
          tendencia del peso en {weightUnit}.
        </p>
      </Card>

      <section className="space-y-2">
        <SectionTitle icon={<Target size={16} aria-hidden />}>Metas diarias</SectionTitle>
        <button
          type="button"
          onClick={() => setEditingGoals(true)}
          className="pressable flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2 text-left text-sm"
        >
          <span className="flex-1">
            {hasGoals
              ? NUTRITION_FIELDS.filter(({ field }) => goals[field] != null)
                  .map(({ field, label, unit }) => `${label} ${format(goals[field], unit)}`)
                  .join(" · ")
              : "Sin metas. Ponlas para ver tu avance del día."}
          </span>
          <ChevronRight size={16} className="text-muted" aria-hidden />
        </button>
      </section>

      {history.length > 0 && (
        <section className="space-y-2">
          <SectionTitle>Historial</SectionTitle>
          <Card className="divide-y divide-line">
            {(showAll ? history : history.slice(0, 14)).map((entry) => (
              <button
                key={entry.localDate}
                type="button"
                onClick={() => open({ tab: "comida", nutritionDate: entry.localDate })}
                aria-label={`Corregir comida del ${formatShortDate(entry.localDate)}`}
                className="pressable flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left"
              >
                <span className="w-16 shrink-0 text-sm text-muted">{formatShortDate(entry.localDate)}</span>
                <span className="flex-1">
                  <span className="block font-semibold tabular-nums">{format(entry.kcal, "kcal")}</span>
                  <span className="block text-xs text-muted tabular-nums">
                    P {format(entry.proteinG, "g")} · C {format(entry.carbsG, "g")} · G {format(entry.fatG, "g")}
                  </span>
                </span>
                <ChevronRight size={16} className="text-muted" aria-hidden />
              </button>
            ))}
            {history.length > 14 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="pressable min-h-11 w-full text-sm font-semibold text-primary"
              >
                {showAll ? "Ver menos" : `Ver los ${history.length} días`}
              </button>
            )}
          </Card>
        </section>
      )}

      <GoalsSheet open={editingGoals} goals={goals} onClose={() => setEditingGoals(false)} />
    </>
  );
}

function MacroBar({
  label,
  unit,
  value,
  goal,
  large = false,
}: {
  label: string;
  unit: string;
  value: number | null;
  goal: number | null;
  large?: boolean;
}) {
  const percent = goalPercent(value, goal);
  // Solo las calorías se pasan "de más"; en los macros se colorea al llegar a la meta.
  const status = large ? kcalStatus(value, goal) : percent != null && percent >= 100 ? "en-meta" : "bajo";
  return (
    <div className="space-y-1">
      <p className="flex items-baseline justify-between gap-1">
        <span className={cn("font-semibold text-muted", large ? "text-sm" : "text-xs")}>{label}</span>
        {large && percent != null && <span className="text-xs text-muted tabular-nums">{percent}%</span>}
      </p>
      <p className={cn("font-bold tabular-nums", large ? "text-2xl" : "text-base")}>
        {value == null ? "—" : number.format(value)}
        <span className="text-sm font-medium text-muted">
          {goal != null ? ` / ${number.format(goal)}` : ""} {unit}
        </span>
      </p>
      {goal != null && (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label={`${label}: ${percent ?? 0}% de la meta`}
          aria-valuenow={Math.min(percent ?? 0, 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn(
              "h-full rounded-full",
              status === "alto" ? "bg-danger" : status === "en-meta" ? "bg-success" : "bg-primary"
            )}
            style={{ width: `${Math.min(percent ?? 0, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="px-3 py-2">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted">{hint}</p>
    </Card>
  );
}

function GoalsSheet({ open, goals, onClose }: { open: boolean; goals: NutritionGoals; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Metas diarias">
      {/* Se monta de nuevo en cada apertura para partir de las metas guardadas. */}
      {open && <GoalsForm goals={goals} onClose={onClose} />}
    </Sheet>
  );
}

function GoalsForm({ goals, onClose }: { goals: NutritionGoals; onClose: () => void }) {
  const { showToast } = useQuickAdd();
  const [values, setValues] = useState<Record<NutritionField, string>>(
    () =>
      Object.fromEntries(NUTRITION_FIELDS.map(({ field }) => [field, goals[field] == null ? "" : String(goals[field])])) as Record<
        NutritionField,
        string
      >
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const next = {} as NutritionGoals;
    for (const { field, label } of NUTRITION_FIELDS) {
      const parsed = parseQuantity(values[field]);
      if (!parsed.ok || parsed.value === 0) return setError(`Meta de ${label.toLowerCase()}: escribe un número mayor que cero o déjala vacía.`);
      next[field] = parsed.value;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveNutritionGoals(next);
        if (!result.ok) return setError(result.error);
        onClose();
        showToast({ message: "Metas guardadas" });
      } catch {
        setError("Sin conexión: las metas se guardan con señal.");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isPending) submit();
      }}
      className="space-y-4 pt-2"
    >
      <div className="grid grid-cols-2 gap-3">
        {NUTRITION_FIELDS.map(({ field, label, unit }) => (
          <label key={field} className="space-y-1">
            <span className="block text-sm font-semibold text-muted">{label}</span>
            <span className="flex items-center gap-1 rounded-xl border border-line bg-surface px-3 focus-within:border-primary">
              <input
                value={values[field]}
                onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
                placeholder="Sin meta"
                inputMode="numeric"
                enterKeyHint={field === "fatG" ? "done" : "next"}
                className="min-h-12 w-full min-w-0 bg-transparent text-lg font-semibold tabular-nums outline-none"
              />
              <span className="text-sm text-muted" aria-hidden>
                {unit}
              </span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">Usa las mismas metas que tienes en Fitia. Deja vacío lo que no quieras seguir.</p>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" block disabled={isPending} className="min-h-12">
        {isPending ? "Guardando..." : "Guardar metas"}
      </Button>
    </form>
  );
}
