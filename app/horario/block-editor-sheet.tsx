"use client";

import { useState, useTransition } from "react";
import { Repeat, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CategoryPicker } from "@/components/category-picker";
import { TaskRow, type TaskRowData } from "@/components/task-row";
import type { QuickCategory } from "@/app/materias/actions";
import { minutesToTime, timeToMinutes, WEEKDAY_LABELS } from "@/lib/date";
import { cn } from "@/lib/cn";
import { createId } from "@/lib/uuid";
import { runOrQueue } from "@/components/offline/run-or-queue";

export type BlockDraft = {
  id: string | null;
  categoryId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  notes: string;
};

// Lunes primero, como la tabla.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Crear o editar un bloque fijo del horario (se repite cada semana). */
export function BlockEditorSheet({
  draft,
  categories,
  attachedTasks,
  onCategoryCreated,
  onClose,
}: {
  draft: BlockDraft | null;
  categories: QuickCategory[];
  attachedTasks: TaskRowData[];
  onCategoryCreated: (category: QuickCategory) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={draft !== null} onClose={onClose} title={draft?.id ? "Editar bloque" : "Nuevo bloque fijo"}>
      {draft && (
        <BlockForm
          key={draft.id ?? `${draft.dayOfWeek}-${draft.startTime}`}
          draft={draft}
          categories={categories}
          attachedTasks={attachedTasks}
          onCategoryCreated={onCategoryCreated}
          onClose={onClose}
        />
      )}
    </Sheet>
  );
}

function BlockForm({
  draft,
  categories,
  attachedTasks,
  onCategoryCreated,
  onClose,
}: {
  draft: BlockDraft;
  categories: QuickCategory[];
  attachedTasks: TaskRowData[];
  onCategoryCreated: (category: QuickCategory) => void;
  onClose: () => void;
}) {
  const [categoryId, setCategoryId] = useState<string | null>(draft.categoryId ?? categories[0]?.id ?? null);
  const [dayOfWeek, setDayOfWeek] = useState(draft.dayOfWeek);
  const [startTime, setStartTime] = useState(draft.startTime.slice(0, 5));
  const [endTime, setEndTime] = useState(draft.endTime.slice(0, 5));
  const [notes, setNotes] = useState(draft.notes);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save() {
    if (!categoryId) return setError("Elige o crea una materia/actividad.");
    setError(null);
    startTransition(async () => {
      const run = await runOrQueue(
        "saveBlock",
        { id: draft.id ?? createId(), categoryId, dayOfWeek, startTime, endTime, notes },
        `Bloque del ${WEEKDAY_LABELS[dayOfWeek].toLowerCase()} ${startTime}`
      );
      if (run.status === "error") return setError(run.error);
      onClose();
    });
  }

  function remove() {
    if (!draft.id) return;
    if (!confirmDelete) return setConfirmDelete(true);
    startTransition(async () => {
      const run = await runOrQueue("deleteBlock", { blockId: draft.id! }, "Eliminar bloque");
      if (run.status === "error") return setError(run.error);
      onClose();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-5 pt-2"
    >
      <p className="flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 text-sm text-fg">
        <Repeat size={16} className="shrink-0 text-primary" aria-hidden />
        Se repite cada {WEEKDAY_LABELS[dayOfWeek].toLowerCase()}.
      </p>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted">Materia o actividad</p>
        <CategoryPicker
          categories={categories}
          value={categoryId}
          onChange={setCategoryId}
          onCreated={onCategoryCreated}
          allowNone={false}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted">Día</p>
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_ORDER.map((day) => (
            <button
              key={day}
              type="button"
              aria-pressed={dayOfWeek === day}
              aria-label={WEEKDAY_LABELS[day]}
              onClick={() => setDayOfWeek(day)}
              className={cn(
                "pressable min-h-11 rounded-xl border text-sm font-semibold",
                dayOfWeek === day ? "border-primary bg-primary text-on-primary" : "border-line bg-surface"
              )}
            >
              {WEEKDAY_LABELS[day].slice(0, 2)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted">Horario</p>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={startTime}
            onChange={(e) => {
              const next = e.target.value;
              const duration = timeToMinutes(endTime) - timeToMinutes(startTime);
              if (duration > 0 && next) setEndTime(minutesToTime(timeToMinutes(next) + duration));
              setStartTime(next);
            }}
            aria-label="Hora de inicio"
            required
            className="min-h-12 flex-1 rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary"
          />
          <span className="text-muted">a</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            aria-label="Hora de fin"
            required
            className="min-h-12 flex-1 rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary"
          />
        </div>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-muted">Notas (salón, liga...)</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opcional"
          enterKeyHint="done"
          className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary"
        />
      </label>

      {attachedTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted">Tareas de esta materia ese día</p>
          {attachedTasks.map((task) => (
            <TaskRow key={task.id} task={task} showCategory={false} />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 flex gap-2 bg-surface px-4 pt-2">
        {draft.id && (
          <Button variant="danger" onClick={remove} disabled={isPending} className="min-h-12" aria-label="Eliminar bloque">
            <Trash2 size={18} aria-hidden />
            {confirmDelete && "¿Seguro?"}
          </Button>
        )}
        <Button type="submit" disabled={isPending} className="min-h-12 flex-1">
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
