"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { Bell, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock, Plus, Repeat } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TaskRow } from "@/components/task-row";
import { useQuickAdd } from "@/components/quick-add/quick-add-provider";
import type { QuickCategory } from "@/app/materias/actions";
import { formatDisplayDate, getLocalTimeString, minutesToTime, timeToMinutes, WEEKDAY_LABELS } from "@/lib/date";
import { abbreviate } from "@/lib/schedule/colors";
import type { DayColumn, GridTask, PlacedBlock, WeekGrid } from "@/lib/schedule/week-grid";
import { cn } from "@/lib/cn";
import { BlockEditorSheet, type BlockDraft } from "./block-editor-sheet";

/** Alto de una hora en la tabla. 52px deja bloques de 30 min tocables (26px) sin hacer la tabla eterna. */
const HOUR_PX = 52;
const SHORT_DAYS = ["D", "L", "M", "M", "J", "V", "S"];

type SlotChoice = { date: string; dayOfWeek: number; startTime: string };

export function WeekGridView({
  grid,
  categories: initialCategories,
  today,
  weekLabel,
  prevWeek,
  nextWeek,
  isCurrentWeek,
}: {
  grid: WeekGrid;
  categories: QuickCategory[];
  today: string;
  weekLabel: string;
  prevWeek: string;
  nextWeek: string;
  isCurrentWeek: boolean;
}) {
  const { open: openQuickAdd } = useQuickAdd();
  // Las creadas aquí se suman a las del servidor hasta que la página se revalide.
  const [createdHere, setCreatedHere] = useState<QuickCategory[]>([]);
  const categories = [...initialCategories, ...createdHere.filter((c) => !initialCategories.some((i) => i.id === c.id))].sort(
    (a, b) => a.name.localeCompare(b.name)
  );
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null);
  const [blockTasks, setBlockTasks] = useState<GridTask[]>([]);
  const [slotChoice, setSlotChoice] = useState<SlotChoice | null>(null);
  const [daySheet, setDaySheet] = useState<DayColumn | null>(null);
  const nowMinutes = useNowMinutes();

  const totalHours = grid.endHour - grid.startHour;
  const hours = Array.from({ length: totalHours }, (_, i) => grid.startHour + i);
  const toY = (minutes: number) => ((minutes - grid.startHour * 60) / 60) * HOUR_PX;

  // Mantener el panel del día sincronizado tras completar/editar (la página se revalida).
  const openDay = daySheet ? grid.days.find((d) => d.date === daySheet.date) ?? null : null;

  function onCategoryCreated(category: QuickCategory) {
    setCreatedHere((prev) => [...prev, category]);
  }

  function onEmptySlot(day: DayColumn, event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const minutes = grid.startHour * 60 + Math.floor(((event.clientY - rect.top) / HOUR_PX) * 2) * 30;
    setSlotChoice({ date: day.date, dayOfWeek: day.dayOfWeek, startTime: minutesToTime(minutes) });
  }

  function editBlock(block: PlacedBlock) {
    setBlockTasks(block.attachedTasks);
    setBlockDraft({
      id: block.id,
      categoryId: block.categoryId,
      dayOfWeek: block.dayOfWeek,
      startTime: block.startTime,
      endTime: block.endTime,
      notes: block.notes ?? "",
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/horario?semana=${prevWeek}`}
          aria-label="Semana anterior"
          className="pressable flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface"
        >
          <ChevronLeft size={20} aria-hidden />
        </Link>
        <div className="text-center">
          <p className="font-semibold">{weekLabel}</p>
          {!isCurrentWeek && (
            <Link href="/horario" className="text-sm font-semibold text-primary">
              Ir a esta semana
            </Link>
          )}
        </div>
        <Link
          href={`/horario?semana=${nextWeek}`}
          aria-label="Semana siguiente"
          className="pressable flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface"
        >
          <ChevronRight size={20} aria-hidden />
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {/* Encabezado de días + fila de pendientes */}
        <div className="sticky top-0 z-10 grid grid-cols-[2rem_repeat(7,minmax(0,1fr))] border-b border-line bg-surface md:grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
          <div />
          {grid.days.map((day) => {
            const isToday = day.date === today;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setDaySheet(day)}
                aria-label={`Ver ${formatDisplayDate(day.date)}`}
                className="pressable flex min-h-12 flex-col items-center justify-center py-1"
              >
                <span className={cn("text-[11px] font-semibold", isToday ? "text-primary" : "text-muted")}>
                  <span className="md:hidden">{SHORT_DAYS[day.dayOfWeek]}</span>
                  <span className="hidden md:inline">{WEEKDAY_LABELS[day.dayOfWeek].slice(0, 3)}</span>
                </span>
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                    isToday && "bg-primary text-on-primary"
                  )}
                >
                  {Number(day.date.slice(8))}
                </span>
              </button>
            );
          })}

          <div className="flex items-center justify-center border-t border-line" aria-hidden>
            <CalendarPlus size={14} className="text-muted" />
          </div>
          {grid.days.map((day) => (
            <button
              key={day.date}
              type="button"
              onClick={() => setDaySheet(day)}
              aria-label={`Pendientes del ${formatDisplayDate(day.date)}: ${day.pendingTasks.length}`}
              className="pressable flex min-h-11 flex-col gap-0.5 border-t border-l border-line p-0.5 text-left"
            >
              {day.pendingTasks.slice(0, 2).map((task) => (
                <span
                  key={task.id}
                  className={cn(
                    "truncate rounded bg-surface-2 px-1 text-[10px] leading-4 font-medium",
                    task.completed && "text-muted line-through"
                  )}
                  style={task.categoryColor ? { boxShadow: `inset 2px 0 0 ${task.categoryColor}` } : undefined}
                >
                  {task.title}
                </span>
              ))}
              {day.pendingTasks.length > 2 && (
                <span className="px-1 text-[10px] font-semibold text-muted">+{day.pendingTasks.length - 2}</span>
              )}
            </button>
          ))}
        </div>

        {/* Cuerpo: horas x días */}
        <div className="grid grid-cols-[2rem_repeat(7,minmax(0,1fr))] md:grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
          <div className="relative" style={{ height: totalHours * HOUR_PX }}>
            {hours.map((hour, i) => (
              <span
                key={hour}
                // La primera hora se alinea abajo de la línea para no cortarse en el borde superior.
                className={`absolute right-1 text-[10px] font-medium text-muted tabular-nums ${i === 0 ? "translate-y-0.5" : "-translate-y-1/2"}`}
                style={{ top: i * HOUR_PX }}
              >
                {hour}
              </span>
            ))}
          </div>

          {grid.days.map((day) => {
            const isToday = day.date === today;
            return (
              <div
                key={day.date}
                onClick={(e) => onEmptySlot(day, e)}
                className={cn("relative cursor-pointer border-l border-line", isToday && "bg-primary-soft/40")}
                style={{
                  height: totalHours * HOUR_PX,
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_PX - 1}px, var(--line) ${HOUR_PX - 1}px, var(--line) ${HOUR_PX}px)`,
                }}
              >
                {day.blocks.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      editBlock(block);
                    }}
                    aria-label={`${block.categoryName}, ${block.startTime.slice(0, 5)} a ${block.endTime.slice(0, 5)}${
                      block.attachedTasks.length ? `, ${block.attachedTasks.length} tareas` : ""
                    }`}
                    className="pressable absolute overflow-hidden rounded-md px-0.5 py-0.5 text-left text-white md:rounded-lg md:px-1.5"
                    style={{
                      top: toY(block.startMin) + 1,
                      height: Math.max(toY(block.endMin) - toY(block.startMin) - 2, 20),
                      left: `calc(${(block.lane / block.lanes) * 100}% + 1px)`,
                      width: `calc(${100 / block.lanes}% - 2px)`,
                      backgroundColor: block.categoryColor,
                    }}
                  >
                    <span className="block truncate text-[10px] leading-3 font-bold md:text-xs">
                      <span className="md:hidden">{abbreviate(block.categoryName)}</span>
                      <span className="hidden md:inline">{block.categoryName}</span>
                    </span>
                    <span className="hidden truncate text-[11px] opacity-90 md:block">
                      {block.startTime.slice(0, 5)}–{block.endTime.slice(0, 5)}
                      {block.notes && ` · ${block.notes}`}
                    </span>
                    {block.attachedTasks.length > 0 && (
                      <span className="absolute right-0.5 bottom-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
                        {block.attachedTasks.filter((t) => !t.completed).length || (
                          <Check size={10} strokeWidth={3.5} aria-hidden />
                        )}
                      </span>
                    )}
                  </button>
                ))}

                {day.timedTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openQuickAdd({ task });
                    }}
                    aria-label={`${task.title}, ${task.startTime?.slice(0, 5)}`}
                    className={cn(
                      "pressable absolute overflow-hidden rounded-md border border-line bg-surface px-0.5 text-left md:px-1.5",
                      task.completed && "opacity-60"
                    )}
                    style={{
                      top: toY(task.startMin) + 1,
                      height: Math.max(toY(task.endMin) - toY(task.startMin) - 2, 20),
                      left: `calc(${(task.lane / task.lanes) * 100}% + 1px)`,
                      width: `calc(${100 / task.lanes}% - 2px)`,
                      boxShadow: `inset 3px 0 0 ${task.categoryColor ?? "var(--accent)"}`,
                    }}
                  >
                    <span
                      className={cn(
                        "flex items-center gap-0.5 truncate pl-0.5 text-[10px] leading-3 font-semibold md:text-xs",
                        task.completed && "line-through"
                      )}
                    >
                      {task.remindAt ? (
                        <Bell size={9} className="hidden shrink-0 sm:block" aria-hidden />
                      ) : (
                        <Clock size={9} className="hidden shrink-0 sm:block" aria-hidden />
                      )}
                      <span className="truncate">{task.title}</span>
                    </span>
                  </button>
                ))}

                {isToday && nowMinutes !== null && nowMinutes >= grid.startHour * 60 && nowMinutes <= grid.endHour * 60 && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 z-[1] h-0.5 bg-accent"
                    style={{ top: toY(nowMinutes) }}
                  >
                    <span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-accent" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs text-muted">
        Toca un espacio vacío para agregar · toca un bloque para editarlo
      </p>

      {/* ¿Qué agregar en el espacio tocado? */}
      <Sheet
        open={slotChoice !== null}
        onClose={() => setSlotChoice(null)}
        title={slotChoice ? `${WEEKDAY_LABELS[slotChoice.dayOfWeek]} · ${slotChoice.startTime}` : ""}
      >
        {slotChoice && (
          <div className="grid gap-3 pt-2">
            <ChoiceButton
              icon={<Repeat size={22} aria-hidden />}
              title="Clase o actividad fija"
              description={`Se repite cada ${WEEKDAY_LABELS[slotChoice.dayOfWeek].toLowerCase()} a esta hora.`}
              onClick={() => {
                const choice = slotChoice;
                setSlotChoice(null);
                setBlockTasks([]);
                setBlockDraft({
                  id: null,
                  categoryId: null,
                  dayOfWeek: choice.dayOfWeek,
                  startTime: choice.startTime,
                  endTime: minutesToTime(timeToMinutes(choice.startTime) + 60),
                  notes: "",
                });
              }}
            />
            <ChoiceButton
              icon={<Clock size={22} aria-hidden />}
              title="Actividad solo este día"
              description={`Algo puntual el ${formatDisplayDate(slotChoice.date)}.`}
              onClick={() => {
                const choice = slotChoice;
                setSlotChoice(null);
                openQuickAdd({ tab: "actividad", dueDate: choice.date, startTime: choice.startTime });
              }}
            />
          </div>
        )}
      </Sheet>

      {/* Todo lo del día */}
      <Sheet
        open={openDay !== null}
        onClose={() => setDaySheet(null)}
        title={openDay ? <span className="capitalize">{formatDisplayDate(openDay.date)}</span> : ""}
      >
        {openDay && <DayDetail day={openDay} />}
      </Sheet>

      <BlockEditorSheet
        draft={blockDraft}
        categories={categories}
        attachedTasks={
          blockDraft?.id
            ? grid.days.flatMap((d) => d.blocks).find((b) => b.id === blockDraft.id)?.attachedTasks ?? blockTasks
            : []
        }
        onCategoryCreated={onCategoryCreated}
        onClose={() => setBlockDraft(null)}
      />
    </div>
  );
}

function DayDetail({ day }: { day: DayColumn }) {
  const { open } = useQuickAdd();
  const tasks = [
    ...[...day.timedTasks].sort((a, b) => a.startMin - b.startMin),
    ...day.blocks.flatMap((b) => b.attachedTasks),
    ...day.pendingTasks,
  ];

  return (
    <div className="space-y-4 pt-2">
      {day.blocks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {day.blocks.map((block) => (
            <span
              key={block.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium"
            >
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: block.categoryColor }} />
              {block.categoryName} {block.startTime.slice(0, 5)}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
        {tasks.length === 0 && <p className="py-4 text-center text-sm text-muted">Nada pendiente este día.</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => open({ tab: "tarea", dueDate: day.date })}>
          <Plus size={18} aria-hidden />
          Tarea
        </Button>
        <Button variant="secondary" onClick={() => open({ tab: "actividad", dueDate: day.date })}>
          <Clock size={18} aria-hidden />
          Actividad
        </Button>
      </div>
    </div>
  );
}

function ChoiceButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{description}</span>
      </span>
    </button>
  );
}

/** Minuto actual en America/Mexico_City; null en el servidor para no desajustar la hidratación. */
function useNowMinutes(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const read = () => setNow(timeToMinutes(getLocalTimeString()));
    const first = setTimeout(read, 0);
    const interval = setInterval(read, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);
  return now;
}
