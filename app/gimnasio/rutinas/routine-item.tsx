"use client";

import Link from "next/link";
import { useTransition } from "react";
import { deleteRoutine } from "./actions";

export function RoutineItem({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
      <Link href={`/gimnasio/rutinas/${id}`} className="flex-1">
        {name}
      </Link>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => deleteRoutine(id))}
        className="text-xs text-danger"
      >
        Eliminar
      </button>
    </div>
  );
}
