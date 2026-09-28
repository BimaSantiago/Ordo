"use client";

import { useTransition } from "react";
import { setCategoryArchived, deleteCategory } from "./actions";

export function CategoryItem({
  id,
  name,
  color,
  type,
  archived,
}: {
  id: string;
  name: string;
  color: string;
  type: string;
  archived: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div className="flex-1">
        <p className={archived ? "text-slate-400 line-through" : ""}>{name}</p>
        <p className="text-xs text-slate-400">{type === "escuela" ? "Escuela" : "Actividad"}</p>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => setCategoryArchived(id, !archived))}
        className="text-xs text-slate-500"
      >
        {archived ? "Reactivar" : "Archivar"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => deleteCategory(id))}
        className="text-xs text-red-500"
      >
        Eliminar
      </button>
    </div>
  );
}
