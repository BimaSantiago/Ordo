"use client";

import { useTransition } from "react";
import { toggleTask } from "./actions";

export function TaskItem({
  id,
  title,
  completed,
}: {
  id: string;
  title: string;
  completed: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
      <input
        type="checkbox"
        defaultChecked={completed}
        disabled={isPending}
        onChange={(e) => startTransition(() => toggleTask(id, e.target.checked))}
        className="h-5 w-5 accent-slate-900"
      />
      <span className={completed ? "text-slate-400 line-through" : ""}>{title}</span>
    </label>
  );
}
