"use client";

import { Check, Flame, Minus, Plus } from "lucide-react";
import { runOrQueue } from "@/components/offline/run-or-queue";
import { useLocalOverride } from "@/components/offline/use-local-override";
import { getLocalDateString } from "@/lib/date";
import { isCompleted, type HabitRule } from "@/lib/habits/streaks";
import { cn } from "@/lib/cn";

export type TodayHabit = HabitRule & {
  id: string;
  name: string;
  unit: string | null;
  /** Valor de hoy según el servidor (0 = nada). */
  todayValue: number;
  /** Racha actual según el servidor (incluye hoy si ya estaba cumplido). */
  streak: number;
};

export function HabitItem({ habit }: { habit: TodayHabit }) {
  const value = useLocalOverride(habit.todayValue);
  const isNumeric = habit.targetCount != null;
  const done = isCompleted(habit, value.value);

  // La racha del servidor ya incluye hoy si estaba cumplido; se ajusta con el valor local.
  const streakBeforeToday = habit.streak - (isCompleted(habit, habit.todayValue) ? 1 : 0);
  const streak = streakBeforeToday + (done ? 1 : 0);

  function save(next: number) {
    const previous = value.value;
    value.set(next);
    // La fecha se fija al tocar: si se sincroniza mañana, cuenta para hoy.
    void runOrQueue("setHabitLog", { habitId: habit.id, localDate: getLocalDateString(), value: next }, `"${habit.name}"`).then(
      (run) => {
        if (run.status === "error") value.set(previous);
      }
    );
  }

  const streakBadge = streak > 0 && (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-bold", done ? "text-accent" : "text-muted")}>
      <Flame size={14} aria-hidden />
      {streak}
      <span className="sr-only">{streak === 1 ? " día de racha" : " días de racha"}</span>
    </span>
  );

  if (!isNumeric) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        onClick={() => save(done ? 0 : 1)}
        className={cn(
          "pressable flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3 text-left",
          done ? "border-success/40 bg-success-soft" : "border-line bg-surface"
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            done ? "bg-success text-surface" : "bg-surface-2 text-muted"
          )}
        >
          {done ? <Check size={20} strokeWidth={3} aria-hidden /> : <Flame size={18} aria-hidden />}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{habit.name}</span>
        {streakBadge}
        <span className={cn("text-sm font-semibold", done ? "text-success" : "text-muted")}>{done ? "Hecho" : "Marcar"}</span>
      </button>
    );
  }

  const target = habit.targetCount!;
  const progress = Math.min(1, value.value / target);

  return (
    <div className={cn("rounded-2xl border px-3 py-2", done ? "border-success/40 bg-success-soft" : "border-line bg-surface")}>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-medium">
            <span className="truncate">{habit.name}</span>
            {streakBadge}
          </p>
          <p className={cn("text-sm tabular-nums", done ? "font-semibold text-success" : "text-muted")}>
            {value.value}/{target} {habit.unit ?? ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => save(Math.max(0, value.value - 1))}
          disabled={value.value === 0}
          aria-label={`Restar 1 a ${habit.name}`}
          className="pressable flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-muted disabled:opacity-40"
        >
          <Minus size={20} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => save(value.value + 1)}
          aria-label={`Sumar 1 a ${habit.name}`}
          className="pressable flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-on-primary"
        >
          <Plus size={22} strokeWidth={2.6} aria-hidden />
        </button>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={value.value}
        aria-label={`Progreso de ${habit.name}`}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-200", done ? "bg-success" : "bg-primary")} style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
