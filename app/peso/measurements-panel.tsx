"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { TrendChart } from "@/components/trend-chart";
import { runOrQueue } from "@/components/offline/run-or-queue";
import { useQuickAdd } from "@/components/quick-add/quick-add-provider";
import { formatShortDate } from "@/lib/date";
import { createId } from "@/lib/uuid";

export type Measurement = { id: string; localDate: string; type: string; value: number };

const DEFAULT_TYPES = ["cintura", "cadera", "pecho", "brazo", "muslo", "cuello"];
const cm = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Medidas corporales en cm, con su propia gráfica por tipo (cintura, brazo…). */
export function MeasurementsPanel({ measurements, today }: { measurements: Measurement[]; today: string }) {
  const { showToast } = useQuickAdd();
  const types = useMemo(
    () => [...new Set([...DEFAULT_TYPES, ...measurements.map((m) => m.type)])],
    [measurements]
  );
  const firstWithData = types.find((t) => measurements.some((m) => m.type === t)) ?? DEFAULT_TYPES[0];
  const [type, setType] = useState(firstWithData);
  const [customType, setCustomType] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedType = isCustom ? customType.trim().toLowerCase() : type;
  const ofType = measurements
    .filter((m) => m.type === selectedType)
    .sort((a, b) => a.localDate.localeCompare(b.localDate));

  function save() {
    const amount = Number(value.replace(",", "."));
    setError(null);
    startTransition(async () => {
      const run = await runOrQueue(
        "saveMeasurement",
        { id: createId(), localDate: date, type: selectedType, value: amount },
        `${capitalize(selectedType)} ${value} cm`
      );
      if (run.status === "error") return setError(run.error);
      setValue("");
      if (isCustom) {
        setType(selectedType);
        setIsCustom(false);
        setCustomType("");
      }
      showToast({ message: run.status === "queued" ? "Sin señal: se guardará al reconectar" : "Medida guardada" });
    });
  }

  function remove(m: Measurement) {
    startTransition(async () => {
      const run = await runOrQueue("deleteMeasurement", { id: m.id }, `Borrar ${m.type} del ${formatShortDate(m.localDate)}`);
      if (run.status === "error") return showToast({ message: run.error });
      showToast({ message: run.status === "queued" ? "Sin señal: se borrará al reconectar" : "Medida borrada" });
    });
  }

  return (
    <section className="space-y-3">
      <SectionTitle>Medidas corporales</SectionTitle>

      <div className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none]">
        {types.map((t) => (
          <Chip
            key={t}
            selected={!isCustom && type === t}
            onClick={() => {
              setIsCustom(false);
              setType(t);
            }}
          >
            {capitalize(t)}
          </Chip>
        ))}
        <Chip selected={isCustom} onClick={() => setIsCustom(true)}>
          <Plus size={16} aria-hidden />
          Otra
        </Chip>
      </div>

      <Card className="space-y-3 p-3">
        {isCustom ? (
          <input
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="¿Qué mediste? (p. ej. pantorrilla)"
            aria-label="Nombre de la medida"
            autoFocus
            className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary"
          />
        ) : (
          <TrendChart points={ofType.map((m) => ({ localDate: m.localDate, value: m.value }))} unit="cm" height={180} />
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value && selectedType) save();
          }}
          className="flex gap-2"
        >
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Fecha de la medida"
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary"
          />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            placeholder="cm"
            aria-label={`${capitalize(selectedType || "medida")} en cm`}
            enterKeyHint="done"
            className="min-h-12 w-20 rounded-xl border border-line bg-surface px-2 text-center text-lg font-semibold outline-none focus:border-primary"
          />
          <Button type="submit" disabled={!value || !selectedType || isPending}>
            Guardar
          </Button>
        </form>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </Card>

      {!isCustom && ofType.length > 0 && (
        <Card className="divide-y divide-line">
          {[...ofType].reverse().map((m) => (
            <div key={m.id} className="flex min-h-12 items-center justify-between gap-2 pl-3">
              <span className="text-sm text-muted">{formatShortDate(m.localDate)}</span>
              <span className="flex items-center gap-1">
                <span className="font-semibold tabular-nums">{cm.format(m.value)} cm</span>
                <button
                  type="button"
                  onClick={() => remove(m)}
                  disabled={isPending}
                  aria-label={`Borrar ${m.type} del ${formatShortDate(m.localDate)}`}
                  className="pressable flex h-11 w-11 items-center justify-center text-muted"
                >
                  <X size={16} aria-hidden />
                </button>
              </span>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
