"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, CheckSquare, Clock, Flame, NotebookPen, Scale, Trash2, Wallet } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CategoryPicker } from "@/components/category-picker";
import { MoneyForm } from "@/components/finance/money-form";
import { DayPicker } from "@/components/day-picker";
import { runOrQueue } from "@/components/offline/run-or-queue";
import { useSettings } from "@/components/settings-provider";
import { roundTo, toKg } from "@/lib/units";
import { EMPTY_HABIT, HabitFields, isHabitDraftValid, type HabitDraft } from "@/components/habits/habit-fields";
import { listActiveCategories, type QuickCategory } from "@/app/materias/actions";
import { getLocalDateString, getLocalTimeString, minutesToTime, timeToMinutes } from "@/lib/date";
import { computeRemindAt, REMINDER_LABELS, reminderOptionsFor, type ReminderOption } from "@/lib/reminders";
import { cn } from "@/lib/cn";
import { createId } from "@/lib/uuid";
import type { QuickAddPrefill, QuickAddTab } from "./quick-add-provider";

const TABS: { value: QuickAddTab; label: string; icon: typeof CheckSquare }[] = [
  { value: "tarea", label: "Tarea", icon: CheckSquare },
  { value: "actividad", label: "Actividad", icon: Clock },
  { value: "dinero", label: "Dinero", icon: Wallet },
  { value: "habito", label: "Hábito", icon: Flame },
  { value: "peso", label: "Peso", icon: Scale },
  { value: "nota", label: "Nota", icon: NotebookPen },
];

const LAST_TAB_KEY = "life-os:quick-add-tab";
const CATEGORIES_CACHE_KEY = "life-os:categories";

function readLastTab(): QuickAddTab {
  try {
    const value = localStorage.getItem(LAST_TAB_KEY);
    if (TABS.some((t) => t.value === value)) return value as QuickAddTab;
  } catch {
    // Almacenamiento bloqueado: se usa el valor por defecto.
  }
  return "tarea";
}

function rememberTab(tab: QuickAddTab) {
  try {
    localStorage.setItem(LAST_TAB_KEY, tab);
  } catch {
    // Sin almacenamiento no pasa nada: solo no se recuerda la pestaña.
  }
}

/** Siguiente media hora a partir de ahora, p. ej. 10:12 → 10:30. */
function nextHalfHour(): string {
  const minutes = timeToMinutes(getLocalTimeString());
  return minutesToTime(Math.min(Math.ceil((minutes + 1) / 30) * 30, 23 * 60 + 30));
}

type Toast = { message: string; undo?: () => void };

export function QuickAddSheet({
  prefill,
  openKey,
  onClose,
  onSaved,
}: {
  prefill: QuickAddPrefill | null;
  /** Cambia en cada apertura para montar un formulario limpio con los valores del prefill. */
  openKey: number;
  onClose: () => void;
  onSaved: (toast: Toast) => void;
}) {
  const isEditing = Boolean(prefill?.task || prefill?.transaction);

  return (
    <Sheet open={prefill !== null} onClose={onClose} title={isEditing ? "Editar" : "Agregar rápido"}>
      {prefill && <QuickAddForm key={openKey} prefill={prefill} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function QuickAddForm({
  prefill,
  onClose,
  onSaved,
}: {
  prefill: QuickAddPrefill;
  onClose: () => void;
  onSaved: (toast: Toast) => void;
}) {
  const task = prefill.task;
  const transaction = prefill.transaction;
  const [tab, setTab] = useState<QuickAddTab>(
    () => prefill.tab ?? (transaction ? "dinero" : task ? (task.startTime ? "actividad" : "tarea") : readLastTab())
  );
  const [categories, setCategories] = useState<QuickCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Tarea / actividad
  const [title, setTitle] = useState(task?.title ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? prefill.dueDate ?? getLocalDateString());
  const [categoryId, setCategoryId] = useState<string | null>(task?.categoryId ?? prefill.categoryId ?? null);
  const initialStart = task?.startTime?.slice(0, 5) ?? prefill.startTime ?? nextHalfHour();
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(
    task ? (task.endTime?.slice(0, 5) ?? "") : minutesToTime(timeToMinutes(initialStart) + 60)
  );
  const [reminder, setReminder] = useState<ReminderOption | "keep">(task?.remindAt ? "keep" : "none");

  const [confirmDelete, setConfirmDelete] = useState(false);

  // Hábito / peso / nota
  const [simpleValue, setSimpleValue] = useState("");
  const [habitDraft, setHabitDraft] = useState<HabitDraft>(EMPTY_HABIT);
  const { weightUnit } = useSettings();

  useEffect(() => {
    // Sin señal se usa la última lista conocida para poder elegir materia igual.
    listActiveCategories()
      .then((list) => {
        setCategories(list);
        try {
          localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(list));
        } catch {
          // Sin almacenamiento: solo no habrá respaldo offline.
        }
      })
      .catch(() => {
        try {
          setCategories(JSON.parse(localStorage.getItem(CATEGORIES_CACHE_KEY) ?? "[]"));
        } catch {
          setCategories([]);
        }
      });
  }, []);

  const hasTime = tab === "actividad";

  function selectTab(next: QuickAddTab) {
    setTab(next);
    setError(null);
    if (!task && !transaction) rememberTab(next);
    // Al cambiar entre tarea/actividad, quitar avisos que ya no aplican.
    if (reminder !== "keep" && reminder !== "none" && !reminderOptionsFor(next === "actividad").includes(reminder)) {
      setReminder("none");
    }
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      if (tab === "tarea" || tab === "actividad") {
        const id = task?.id ?? createId();
        const start = hasTime ? startTime : null;
        const run = await runOrQueue(
          "saveTask",
          {
            id,
            title,
            dueDate,
            categoryId,
            startTime: start,
            endTime: hasTime && endTime ? endTime : null,
            remindAt: reminder === "keep" ? (task?.remindAt ?? null) : computeRemindAt(reminder, dueDate, start),
            ...(!task && prefill.projectId && { projectId: prefill.projectId }),
          },
          title.trim()
        );
        if (run.status === "error") return setError(run.error);
        onClose();
        if (run.status === "queued") return onSaved({ message: "Sin señal: se guardará al reconectar" });
        onSaved(
          task
            ? { message: "Cambios guardados" }
            : {
                message: hasTime ? "Actividad agregada" : "Tarea agregada",
                undo: () => void runOrQueue("deleteTask", { taskId: id }, `Deshacer "${title.trim()}"`),
              }
        );
        return;
      }

      const run =
        tab === "habito"
          ? await runOrQueue("saveHabit", { ...habitDraft, id: createId() }, `Hábito "${habitDraft.name.trim()}"`)
          : tab === "peso"
            ? await runOrQueue(
                "saveWeight",
                {
                  localDate: getLocalDateString(),
                  weightKg: roundTo(toKg(Number(simpleValue.replace(",", ".")), weightUnit), 2),
                },
                `Peso ${simpleValue} ${weightUnit}`
              )
            : await runOrQueue("saveQuickNote", { id: createId(), body: simpleValue }, "Nota rápida");
      if (run.status === "error") return setError(run.error);
      onClose();
      if (run.status === "queued") return onSaved({ message: "Sin señal: se guardará al reconectar" });
      onSaved({ message: tab === "habito" ? "Hábito creado" : tab === "peso" ? "Peso guardado" : "Nota guardada" });
    });
  }

  const canSubmit =
    tab === "tarea" || tab === "actividad"
      ? title.trim().length > 0 && (!hasTime || Boolean(startTime))
      : tab === "habito"
        ? isHabitDraftValid(habitDraft)
        : simpleValue.trim().length > 0;

  const tabBar = (
    <div role="tablist" aria-label="Qué quieres agregar" className="grid grid-cols-6 gap-1 rounded-2xl bg-surface-2 p-1">
      {TABS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={tab === value}
          onClick={() => selectTab(value)}
          className={cn(
            "pressable flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold",
            tab === value ? "bg-surface text-primary" : "text-muted"
          )}
        >
          <Icon size={20} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );

  if (tab === "dinero") {
    return (
      <div className="space-y-5 pt-2">
        {!transaction && tabBar}
        <MoneyForm transaction={transaction} onClose={onClose} onSaved={onSaved} />
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit && !isPending) submit();
      }}
      className="space-y-5 pt-2"
    >
      {!task && tabBar}

      {(tab === "tarea" || tab === "actividad") && (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={hasTime ? "¿Qué vas a hacer? (p. ej. Partido)" : "¿Qué tienes que hacer?"}
            aria-label="Título"
            enterKeyHint="done"
            autoFocus={!task}
            className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-lg font-medium outline-none focus:border-primary"
          />

          {task && (
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
              {(["tarea", "actividad"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={tab === value}
                  onClick={() => selectTab(value)}
                  className={cn(
                    "pressable min-h-11 rounded-xl text-sm font-semibold",
                    tab === value ? "bg-surface text-primary" : "text-muted"
                  )}
                >
                  {value === "tarea" ? "Sin hora" : "Con hora"}
                </button>
              ))}
            </div>
          )}

          <Field label="Día">
            <DayPicker value={dueDate} onChange={setDueDate} />
          </Field>

          {hasTime && (
            <Field label="Hora">
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    const next = e.target.value;
                    // Mantener la duración al mover el inicio.
                    if (endTime && startTime) {
                      const duration = timeToMinutes(endTime) - timeToMinutes(startTime);
                      if (duration > 0) setEndTime(minutesToTime(timeToMinutes(next) + duration));
                    }
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
                  aria-label="Hora de fin (opcional)"
                  className="min-h-12 flex-1 rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary"
                />
              </div>
            </Field>
          )}

          <Field label="Materia o actividad">
            <CategoryPicker
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              onCreated={(category) => setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)))}
            />
          </Field>

          <Field label="Recordatorio" icon={<Bell size={14} aria-hidden />}>
            <div className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none]">
              {reminder === "keep" && <Chip selected>Aviso actual</Chip>}
              {reminderOptionsFor(hasTime).map((option) => (
                <Chip key={option} selected={reminder === option} onClick={() => setReminder(option)}>
                  {REMINDER_LABELS[option]}
                </Chip>
              ))}
            </div>
          </Field>
        </>
      )}

      {tab === "habito" && (
        <HabitFields value={habitDraft} onChange={setHabitDraft} autoFocus />
      )}
      {tab === "peso" && (
        <SimpleInput
          label={`Peso de hoy (${weightUnit})`}
          placeholder="72.5"
          inputMode="decimal"
          value={simpleValue}
          onChange={setSimpleValue}
        />
      )}
      {tab === "nota" && (
        <SimpleInput label="Nota rápida" placeholder="Escribe algo..." value={simpleValue} onChange={setSimpleValue} />
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 flex gap-2 bg-surface px-4 pt-2 pb-[env(safe-area-inset-bottom,0px)]">
        {task && (
          <Button
            variant="danger"
            disabled={isPending}
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              startTransition(async () => {
                const run = await runOrQueue("deleteTask", { taskId: task.id }, `Eliminar "${task.title}"`);
                if (run.status === "error") return setError(run.error);
                onClose();
                onSaved({ message: run.status === "queued" ? "Sin señal: se eliminará al reconectar" : "Eliminada" });
              });
            }}
            className="min-h-12"
            aria-label={confirmDelete ? "Confirmar eliminar" : "Eliminar"}
          >
            <Trash2 size={18} aria-hidden />
            {confirmDelete && "¿Seguro?"}
          </Button>
        )}
        <Button type="submit" block disabled={!canSubmit || isPending} className="min-h-12 flex-1">
          {isPending ? "Guardando..." : task ? "Guardar cambios" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-muted">
        {icon}
        {label}
      </p>
      {children}
    </div>
  );
}

function SimpleInput({
  label,
  placeholder,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "decimal";
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        enterKeyHint="done"
        autoFocus
        className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-lg font-medium outline-none focus:border-primary"
      />
    </label>
  );
}
