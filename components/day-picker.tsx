"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { addDaysToLocalDate, formatShortDate, getLocalDateString, getLocalDayOfWeek, getLocalWeekStart } from "@/lib/date";

const SHORT_DAYS = ["L", "M", "M", "J", "V", "S", "D"];

/** Hoy, Mañana y los 7 días de la semana en chips; "Otra" abre el selector de fecha nativo. */
export function DayPicker({ value, onChange }: { value: string; onChange: (localDate: string) => void }) {
  const today = getLocalDateString();
  const tomorrow = addDaysToLocalDate(today, 1);

  const weekDays = useMemo(() => {
    // Si estás en domingo, lo útil es la semana que empieza mañana ("Hoy" ya tiene su propio chip).
    const anchor = value > today ? value : getLocalDayOfWeek(today) === 0 ? tomorrow : today;
    const start = getLocalWeekStart(anchor);
    return Array.from({ length: 7 }, (_, i) => addDaysToLocalDate(start, i));
  }, [today, tomorrow, value]);

  const isOther = value !== today && value !== tomorrow && !weekDays.includes(value);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Chip selected={value === today} onClick={() => onChange(today)}>
          Hoy
        </Chip>
        <Chip selected={value === tomorrow} onClick={() => onChange(tomorrow)}>
          Mañana
        </Chip>
        <label
          className={`pressable relative inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium ${
            isOther ? "border-primary bg-primary text-on-primary" : "border-line bg-surface"
          }`}
        >
          <CalendarDays size={16} aria-hidden />
          {isOther ? formatShortDate(value) : "Otra"}
          <input
            type="date"
            value={value}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            aria-label="Elegir otra fecha"
            className="absolute inset-0 opacity-0"
          />
        </label>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((date, i) => {
          const selected = value === date;
          return (
            <button
              key={date}
              type="button"
              aria-pressed={selected}
              aria-label={formatShortDate(date)}
              onClick={() => onChange(date)}
              className={`pressable flex min-h-12 flex-col items-center justify-center rounded-xl border text-xs ${
                selected
                  ? "border-primary bg-primary text-on-primary"
                  : date === today
                    ? "border-primary/50 bg-primary-soft"
                    : "border-line bg-surface"
              } ${date < today && !selected ? "opacity-50" : ""}`}
            >
              <span className="font-semibold">{SHORT_DAYS[i]}</span>
              <span>{Number(date.slice(8))}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
