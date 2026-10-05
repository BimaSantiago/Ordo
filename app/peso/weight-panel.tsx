"use client";

import { useState, useTransition } from "react";
import { TrendingDown, TrendingUp, X } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { TrendChart } from "@/components/trend-chart";
import { runOrQueue } from "@/components/offline/run-or-queue";
import { useQuickAdd } from "@/components/quick-add/quick-add-provider";
import { formatShortDate, getLocalDateString } from "@/lib/date";
import { lastDays, movingAverage, trendChange, type DatedValue } from "@/lib/body/trend";
import { cn } from "@/lib/cn";
import { useSettings } from "@/components/settings-provider";
import { fromKg, roundTo, toKg } from "@/lib/units";

// Los valores ya están en la unidad del usuario.
const decimal1 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

const RANGES = [
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
  { label: "Todo", days: null },
] as const;

export function WeightPanel({ weights: weightsKg, today }: { weights: DatedValue[]; today: string }) {
  const { showToast } = useQuickAdd();
  const { weightUnit } = useSettings();
  // Todo llega en kg; se muestra y se captura en la unidad del usuario.
  const weights = weightsKg.map((w) => ({ ...w, value: fromKg(w.value, weightUnit) }));
  const [range, setRange] = useState<number | null>(30);
  const [date, setDate] = useState(today);
  const [value, setValue] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const latest = weights.at(-1);
  const trend = movingAverage(weights).at(-1);
  const change30 = trendChange(weights, 30);
  const history = [...weights].reverse();

  function save() {
    const weightKg = roundTo(toKg(Number(value.replace(",", ".")), weightUnit), 2);
    setError(null);
    startTransition(async () => {
      const run = await runOrQueue(
        "saveWeight",
        { localDate: date, weightKg },
        `Peso ${value} ${weightUnit} (${formatShortDate(date)})`
      );
      if (run.status === "error") return setError(run.error);
      setValue("");
      setDate(getLocalDateString());
      showToast({ message: run.status === "queued" ? "Sin señal: se guardará al reconectar" : "Peso guardado" });
    });
  }

  function remove(localDate: string) {
    startTransition(async () => {
      const run = await runOrQueue("deleteWeight", { localDate }, `Borrar peso del ${formatShortDate(localDate)}`);
      if (run.status === "error") return showToast({ message: run.error });
      showToast({ message: run.status === "queued" ? "Sin señal: se borrará al reconectar" : "Registro borrado" });
    });
  }

  return (
    <section className="space-y-3">
      <SectionTitle>Peso corporal</SectionTitle>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="último" value={latest ? `${decimal1.format(latest.value)}` : "—"} hint={latest ? formatShortDate(latest.localDate) : "sin registros"} />
        <Stat label="tendencia" value={trend ? decimal1.format(trend.value) : "—"} hint="media 7 días" />
        <Stat
          label="30 días"
          value={change30 == null ? "—" : `${change30 > 0 ? "+" : ""}${decimal1.format(change30)}`}
          hint="cambio"
          icon={
            change30 == null || change30 === 0 ? null : change30 > 0 ? (
              <TrendingUp size={14} aria-hidden />
            ) : (
              <TrendingDown size={14} aria-hidden />
            )
          }
        />
      </div>

      <Card className="space-y-2 p-3">
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <Chip key={r.label} selected={range === r.days} onClick={() => setRange(r.days)}>
              {r.label}
            </Chip>
          ))}
        </div>
        <TrendChart points={lastDays(weights, range, today)} unit={weightUnit} />
      </Card>

      <Card className="space-y-3 p-3">
        <p className="text-sm font-semibold text-muted">Registrar</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value) save();
          }}
          className="flex gap-2"
        >
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Fecha del registro"
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary"
          />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            placeholder={weightUnit}
            aria-label={`Peso en ${weightUnit}`}
            enterKeyHint="done"
            className="min-h-12 w-24 rounded-xl border border-line bg-surface px-3 text-center text-lg font-semibold outline-none focus:border-primary"
          />
          <Button type="submit" disabled={!value || isPending}>
            Guardar
          </Button>
        </form>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <p className="text-xs text-muted">Si ya hay un registro en esa fecha, se reemplaza.</p>
      </Card>

      {history.length > 0 && (
        <Card className="divide-y divide-line">
          {(showAll ? history : history.slice(0, 7)).map((entry) => (
            <div key={entry.localDate} className="flex min-h-12 items-center justify-between gap-2 pl-3">
              <span className="text-sm text-muted">{formatShortDate(entry.localDate)}</span>
              <span className="flex items-center gap-1">
                <span className="font-semibold tabular-nums">
                  {decimal1.format(entry.value)} {weightUnit}
                </span>
                <button
                  type="button"
                  onClick={() => remove(entry.localDate)}
                  disabled={isPending}
                  aria-label={`Borrar peso del ${formatShortDate(entry.localDate)}`}
                  className="pressable flex h-11 w-11 items-center justify-center text-muted"
                >
                  <X size={16} aria-hidden />
                </button>
              </span>
            </div>
          ))}
          {history.length > 7 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="pressable min-h-11 w-full text-sm font-semibold text-primary"
            >
              {showAll ? "Ver menos" : `Ver los ${history.length} registros`}
            </button>
          )}
        </Card>
      )}
    </section>
  );
}

function Stat({ label, value, hint, icon }: { label: string; value: string; hint: string; icon?: React.ReactNode }) {
  return (
    <Card className="px-3 py-2">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={cn("flex items-center gap-1 text-lg font-bold tabular-nums")}>
        {value}
        {icon}
      </p>
      <p className="text-[11px] text-muted">{hint}</p>
    </Card>
  );
}
