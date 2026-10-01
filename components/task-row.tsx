"use client";

import { useOptimistic, useTransition } from "react";
import { Bell, Check, Clock, Pencil } from "lucide-react";
import { toggleTask } from "@/app/tareas/actions";
import { useQuickAdd, type EditableTask } from "@/components/quick-add/quick-add-provider";
import { cn } from "@/lib/cn";

export type TaskRowData = EditableTask & {
  completed: boolean;
  categoryName: string | null;
  categoryColor: string | null;
};

/** Tarea con casilla grande (44px) para completarla de un toque y botón para editarla en el panel. */
export function TaskRow({ task, showCategory = true }: { task: TaskRowData; showCategory?: boolean }) {
  const { open } = useQuickAdd();
  const [, startTransition] = useTransition();
  const [completed, setOptimisticCompleted] = useOptimistic(task.completed);

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface pr-1">
      <button
        type="button"
        role="checkbox"
        aria-checked={completed}
        aria-label={completed ? `Marcar "${task.title}" como pendiente` : `Completar "${task.title}"`}
        onClick={() =>
          startTransition(async () => {
            setOptimisticCompleted(!completed);
            await toggleTask(task.id, !completed);
          })
        }
        className="pressable flex h-12 w-12 shrink-0 items-center justify-center"
      >
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-colors",
            completed ? "border-success bg-success text-surface" : "border-line"
          )}
        >
          {completed && <Check size={16} strokeWidth={3} aria-hidden />}
        </span>
      </button>

      <div className="min-w-0 flex-1 py-2">
        <p className={cn("truncate font-medium", completed && "text-muted line-through")}>{task.title}</p>
        {(task.startTime || (showCategory && task.categoryName) || task.remindAt) && (
          <p className="flex items-center gap-2 text-xs text-muted">
            {task.startTime && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} aria-hidden />
                {task.startTime.slice(0, 5)}
                {task.endTime && `–${task.endTime.slice(0, 5)}`}
              </span>
            )}
            {showCategory && task.categoryName && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: task.categoryColor ?? undefined }}
                />
                <span className="truncate">{task.categoryName}</span>
              </span>
            )}
            {task.remindAt && <Bell size={12} aria-label="Con recordatorio" />}
          </p>
        )}
      </div>

      <button
        type="button"
        aria-label={`Editar "${task.title}"`}
        onClick={() =>
          open({
            task: {
              id: task.id,
              title: task.title,
              dueDate: task.dueDate,
              categoryId: task.categoryId,
              startTime: task.startTime,
              endTime: task.endTime,
              remindAt: task.remindAt,
            },
          })
        }
        className="pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted"
      >
        <Pencil size={18} aria-hidden />
      </button>
    </div>
  );
}
