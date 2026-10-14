"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarDays, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { runOrQueue } from "@/components/offline/run-or-queue";
import { getNutritionDay } from "@/app/comida/actions";
import { addDaysToLocalDate, formatShortDate, getLocalDateString } from "@/lib/date";
import { macroKcal, NUTRITION_FIELDS, parseQuantity, type NutritionDay, type NutritionField } from "@/lib/nutrition/summary";
import { cn } from "@/lib/cn";

type Toast = { message: string; undo?: () => void };
type Values = Record<NutritionField, string>;

const EMPTY: Values = { kcal: "", proteinG: "", carbsG: "", fatG: "" };
const integer = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

function toValues(day: NutritionDay | null): Values {
  if (!day) return EMPTY;
  const text = (value: number | null) => (value == null ? "" : String(value));
  return { kcal: text(day.kcal), proteinG: text(day.proteinG), carbsG: text(day.carbsG), fatG: text(day.fatG) };
}

/**
 * Totales del día copiados de Fitia: calorías y los tres macros. Al elegir una fecha precarga lo
 * que ya se guardó (si hay señal); guardar reemplaza ese día.
 */
export function NutritionForm({
  initialDate,
  onClose,
  onSaved,
}: {
  initialDate?: string;
  onClose: () => void;
  onSaved: (toast: Toast) => void;
}) {
  const today = getLocalDateString();
  const yesterday = addDaysToLocalDate(today, -1);

  const [localDate, setLocalDate] = useState(initialDate ?? today);
  const [values, setValues] = useState<Values>(EMPTY);
  const [existing, setExisting] = useState<NutritionDay | null>(null);
  // Si ya se empezó a escribir, la respuesta del servidor no pisa lo escrito.
  const touched = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getNutritionDay(localDate)
      .then((day) => {
        if (cancelled) return;
        setExisting(day);
        if (!touched.current) setValues(toValues(day));
      })
      .catch(() => {
        // Sin señal: se captura en blanco y se guarda en la cola.
        if (!cancelled) setExisting(null);
      });
    return () => {
      cancelled = true;
    };
  }, [localDate]);

  function selectDate(next: string) {
    if (next === localDate) return;
    setLocalDate(next);
    setValues(EMPTY);
    setExisting(null);
    touched.current = false;
    setConfirmDelete(false);
    setError(null);
  }

  const parsed = Object.fromEntries(NUTRITION_FIELDS.map(({ field }) => [field, parseQuantity(values[field])])) as Record<
    NutritionField,
    ReturnType<typeof parseQuantity>
  >;
  const allValid = NUTRITION_FIELDS.every(({ field }) => parsed[field].ok);
  const numbers = Object.fromEntries(
    NUTRITION_FIELDS.map(({ field }) => [field, parsed[field].ok ? parsed[field].value : null])
  ) as Record<NutritionField, number | null>;
  const hasAny = NUTRITION_FIELDS.some(({ field }) => numbers[field] != null);
  const fromMacros = macroKcal(numbers);
  const canSubmit = allValid && hasAny;

  function submit() {
    setError(null);
    startTransition(async () => {
      const label = `Comida ${numbers.kcal != null ? `${integer.format(numbers.kcal)} kcal ` : ""}(${formatShortDate(localDate)})`;
      const run = await runOrQueue("saveNutrition", { localDate, ...numbers }, label);
      if (run.status === "error") return setError(run.error);
      onClose();
      onSaved({ message: run.status === "queued" ? "Sin señal: se guardará al reconectar" : "Comida guardada" });
    });
  }

  function remove() {
    if (!confirmDelete) return setConfirmDelete(true);
    startTransition(async () => {
      const run = await runOrQueue("deleteNutrition", { localDate }, `Borrar comida del ${formatShortDate(localDate)}`);
      if (run.status === "error") return setError(run.error);
      onClose();
      onSaved({ message: run.status === "queued" ? "Sin señal: se borrará al reconectar" : "Registro borrado" });
    });
  }

  const isOtherDate = localDate !== today && localDate !== yesterday;
  const [kcalField, ...macroFields] = NUTRITION_FIELDS;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit && !isPending) submit();
      }}
      className="space-y-5"
    >
      <div className="flex gap-2">
        <Chip selected={localDate === today} onClick={() => selectDate(today)}>
          Hoy
        </Chip>
        <Chip selected={localDate === yesterday} onClick={() => selectDate(yesterday)}>
          Ayer
        </Chip>
        <label
          className={cn(
            "pressable relative inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium",
            isOtherDate ? "border-primary bg-primary text-on-primary" : "border-line bg-surface"
          )}
        >
          <CalendarDays size={16} aria-hidden />
          {isOtherDate ? formatShortDate(localDate) : "Otra"}
          <input
            type="date"
            value={localDate}
            max={today}
            onChange={(e) => e.target.value && selectDate(e.target.value)}
            aria-label="Elegir otra fecha"
            className="absolute inset-0 opacity-0"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-primary">
        <input
          value={values.kcal}
          onChange={(e) => {
            touched.current = true;
            setValues((v) => ({ ...v, kcal: e.target.value }));
          }}
          placeholder="0"
          inputMode="numeric"
          enterKeyHint="next"
          aria-label={kcalField.label}
          aria-invalid={!parsed.kcal.ok}
          autoFocus
          className="min-h-14 w-full bg-transparent text-3xl font-bold tabular-nums outline-none"
        />
        <span className="text-lg font-semibold text-muted" aria-hidden>
          kcal
        </span>
      </label>

      <div className="grid grid-cols-3 gap-2">
        {macroFields.map(({ field, label, unit }) => (
          <label key={field} className="space-y-1">
            <span className="block text-xs font-semibold text-muted">{label}</span>
            <span className="flex items-center gap-1 rounded-xl border border-line bg-surface px-2 focus-within:border-primary">
              <input
                value={values[field]}
                onChange={(e) => {
                  touched.current = true;
                  setValues((v) => ({ ...v, [field]: e.target.value }));
                }}
                placeholder="0"
                inputMode="decimal"
                enterKeyHint={field === "fatG" ? "done" : "next"}
                aria-invalid={!parsed[field].ok}
                className="min-h-12 w-full min-w-0 bg-transparent text-center text-lg font-semibold tabular-nums outline-none"
              />
              <span className="text-sm text-muted" aria-hidden>
                {unit}
              </span>
            </span>
          </label>
        ))}
      </div>

      <p className="text-xs text-muted">
        {fromMacros != null && `Los macros suman ≈ ${integer.format(fromMacros)} kcal. `}
        {existing ? "Ya hay un registro de este día: se reemplaza." : "Copia los totales del día de Fitia."}
      </p>

      {!allValid && (
        <p role="alert" className="text-sm text-danger">
          Revisa los valores: solo números (p. ej. 1850 o 140.5).
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 flex gap-2 bg-surface px-4 pt-2 pb-[env(safe-area-inset-bottom,0px)]">
        {existing && (
          <Button
            variant="danger"
            disabled={isPending}
            onClick={remove}
            className="min-h-12"
            aria-label={confirmDelete ? "Confirmar borrar el registro" : "Borrar el registro de este día"}
          >
            <Trash2 size={18} aria-hidden />
            {confirmDelete && "¿Seguro?"}
          </Button>
        )}
        <Button type="submit" block disabled={!canSubmit || isPending} className="min-h-12 flex-1">
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
