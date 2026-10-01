"use client";

import { useOptimistic, useTransition } from "react";
import { Check, Flame } from "lucide-react";
import { toggleHabitToday } from "./actions";
import { cn } from "@/lib/cn";

export function HabitItem({ id, name, doneToday }: { id: string; name: string; doneToday: boolean }) {
  const [, startTransition] = useTransition();
  const [done, setOptimisticDone] = useOptimistic(doneToday);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      onClick={() =>
        startTransition(async () => {
          setOptimisticDone(!done);
          await toggleHabitToday(id, !done);
        })
      }
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
      <span className="flex-1 font-medium">{name}</span>
      <span className={cn("text-sm font-semibold", done ? "text-success" : "text-muted")}>
        {done ? "Hecho" : "Marcar"}
      </span>
    </button>
  );
}
