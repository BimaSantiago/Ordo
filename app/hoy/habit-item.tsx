"use client";

import { useTransition } from "react";
import { toggleHabitToday } from "./actions";

export function HabitItem({
  id,
  name,
  doneToday,
}: {
  id: string;
  name: string;
  doneToday: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => toggleHabitToday(id, !doneToday))}
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left ${
        doneToday ? "border-emerald-300 bg-emerald-50" : "border-slate-200"
      }`}
    >
      <span>{name}</span>
      <span className="text-sm">{doneToday ? "✓ Hecho" : "Marcar"}</span>
    </button>
  );
}
