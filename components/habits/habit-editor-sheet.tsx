"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { runOrQueue } from "@/components/offline/run-or-queue";
import { createId } from "@/lib/uuid";
import { EMPTY_HABIT, HabitFields, isHabitDraftValid, type HabitDraft } from "./habit-fields";

export type EditableHabit = HabitDraft & { id: string; archived: boolean };

/** Crear (habit = "new") o editar un hábito; también archivar y eliminar. */
export function HabitEditorSheet({
  habit,
  onClose,
}: {
  habit: EditableHabit | "new" | null;
  onClose: () => void;
}) {
  const key = habit === "new" ? "new" : habit?.id;
  return (
    <Sheet open={habit !== null} onClose={onClose} title={habit === "new" ? "Nuevo hábito" : "Editar hábito"}>
      {habit !== null && <HabitEditorForm key={key} habit={habit} onClose={onClose} />}
    </Sheet>
  );
}

function HabitEditorForm({ habit, onClose }: { habit: EditableHabit | "new"; onClose: () => void }) {
  const existing = habit === "new" ? null : habit;
  // Solo los campos editables (el hábito de la pantalla trae también su historial).
  const [draft, setDraft] = useState<HabitDraft>(
    existing
      ? {
          name: existing.name,
          frequency: existing.frequency,
          frequencyDays: existing.frequencyDays,
          targetCount: existing.targetCount,
          unit: existing.unit,
        }
      : EMPTY_HABIT
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(action: () => ReturnType<typeof runOrQueue>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === "error") return setError(result.error);
      onClose();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isHabitDraftValid(draft)) return;
        run(() => runOrQueue("saveHabit", { ...draft, id: existing?.id ?? createId() }, `Hábito "${draft.name.trim()}"`));
      }}
      className="space-y-5 pt-2"
    >
      <HabitFields value={draft} onChange={setDraft} autoFocus={!existing} />

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {existing && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() =>
              run(() =>
                runOrQueue(
                  "setHabitArchived",
                  { habitId: existing.id, archived: !existing.archived },
                  `${existing.archived ? "Reactivar" : "Archivar"} "${existing.name}"`
                )
              )
            }
          >
            {existing.archived ? <ArchiveRestore size={18} aria-hidden /> : <Archive size={18} aria-hidden />}
            {existing.archived ? "Reactivar" : "Archivar"}
          </Button>
          <Button
            variant="danger"
            disabled={isPending}
            onClick={() =>
              confirmDelete
                ? run(() => runOrQueue("deleteHabit", { habitId: existing.id }, `Eliminar "${existing.name}"`))
                : setConfirmDelete(true)
            }
          >
            <Trash2 size={18} aria-hidden />
            {confirmDelete ? "¿Seguro?" : "Eliminar"}
          </Button>
        </div>
      )}
      {confirmDelete && <p className="text-sm text-danger">Se borrará también todo su historial. Archivarlo lo conserva.</p>}

      <div className="sticky bottom-0 -mx-4 bg-surface px-4 pt-2">
        <Button type="submit" block disabled={isPending || !isHabitDraftValid(draft)} className="min-h-12">
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
