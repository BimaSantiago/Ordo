"use client";

import { Check, Flame } from "lucide-react";
import { runOrQueue } from "@/components/offline/run-or-queue";
import { useLocalOverride } from "@/components/offline/use-local-override";
import { getLocalDateString } from "@/lib/date";
import { cn } from "@/lib/cn";

export function HabitItem({ id, name, doneToday }: { id: string; name: string; doneToday: boolean }) {
  const done = useLocalOverride(doneToday);

  function toggle() {
    const next = !done.value;
    done.set(next);
    // La fecha se fija al tocar: si se sincroniza mañana, cuenta para hoy.
    void runOrQueue(
      "setHabitLog",
      { habitId: id, localDate: getLocalDateString(), done: next },
      `${next ? "Marcar" : "Desmarcar"} "${name}"`
    ).then((run) => {
      if (run.status === "error") done.set(!next);
    });
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done.value}
      onClick={toggle}
      className={cn(
        "pressable flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3 text-left",
        done.value ? "border-success/40 bg-success-soft" : "border-line bg-surface"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          done.value ? "bg-success text-surface" : "bg-surface-2 text-muted"
        )}
      >
        {done.value ? <Check size={20} strokeWidth={3} aria-hidden /> : <Flame size={18} aria-hidden />}
      </span>
      <span className="flex-1 font-medium">{name}</span>
      <span className={cn("text-sm font-semibold", done.value ? "text-success" : "text-muted")}>
        {done.value ? "Hecho" : "Marcar"}
      </span>
    </button>
  );
}
