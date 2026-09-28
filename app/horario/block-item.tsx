"use client";

import { useTransition } from "react";
import { deleteBlock } from "./actions";

export function BlockItem({
  id,
  categoryName,
  categoryColor,
  startTime,
  endTime,
  notes,
}: {
  id: string;
  categoryName: string;
  categoryColor: string;
  startTime: string;
  endTime: string;
  notes: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: categoryColor }}
        aria-hidden
      />
      <div className="flex-1">
        <p className="text-sm font-medium">{categoryName}</p>
        <p className="text-xs text-slate-500">
          {startTime.slice(0, 5)}–{endTime.slice(0, 5)}
          {notes ? ` · ${notes}` : ""}
        </p>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => deleteBlock(id))}
        className="text-xs text-red-500"
      >
        Quitar
      </button>
    </div>
  );
}
