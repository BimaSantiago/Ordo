"use client";

import { useState } from "react";
import { Flame, Pencil, Plus, Trophy } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HabitEditorSheet, type EditableHabit } from "@/components/habits/habit-editor-sheet";
import { addDaysToLocalDate, getLocalWeekStart, WEEKDAY_LABELS } from "@/lib/date";
import { bestStreak, completionRate, currentStreak, dayStatus, type DayStatus } from "@/lib/habits/streaks";
import type { HabitView } from "@/lib/habits/load";
import { cn } from "@/lib/cn";

const STATUS_STYLES: Record<DayStatus, string> = {
  done: "bg-success",
  missed: "bg-danger/35",
  pending: "border-2 border-primary",
  not_due: "bg-surface-2",
  future: "border border-dashed border-line",
};

const STATUS_LABELS: Record<DayStatus, string> = {
  done: "cumplido",
  missed: "no cumplido",
  pending: "pendiente",
  not_due: "no tocaba",
  future: "por venir",
};

const SHORT_DAYS = ["L", "M", "M", "J", "V", "S", "D"];

function frequencyLabel(habit: HabitView): string {
  const target = habit.targetCount ? `${habit.targetCount} ${habit.unit ?? ""}`.trim() + " al día" : "Sí / No";
  if (habit.frequency === "diaria") return `${target} · todos los días`;
  const days = [...(habit.frequencyDays ?? [])]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((d) => WEEKDAY_LABELS[d].slice(0, 2))
    .join(", ");
  return `${target} · ${days}`;
}

function percent(rate: number | null): string {
  return rate == null ? "—" : `${Math.round(rate * 100)}%`;
}

export function HabitBoard({ habits, today }: { habits: HabitView[]; today: string }) {
  const [editing, setEditing] = useState<EditableHabit | "new" | null>(null);
  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);

  return (
    <div className="space-y-5">
      <Button block onClick={() => setEditing("new")}>
        <Plus size={18} aria-hidden />
        Nuevo hábito
      </Button>

      {active.length === 0 && (
        <Card className="px-4 py-6 text-center text-sm text-muted">
          Crea tu primer hábito: sí/no (p. ej. &quot;Leer&quot;), en ciertos días (p. ej. &quot;Correr L-Mi-V&quot;) o con meta
          numérica (p. ej. &quot;Agua: 8 vasos&quot;).
        </Card>
      )}

      {active.map((habit) => (
        <HabitCard key={habit.id} habit={habit} today={today} onEdit={() => setEditing(habit)} />
      ))}

      {archived.length > 0 && (
        <section className="space-y-2">
          <SectionTitle>Archivados</SectionTitle>
          <Card className="divide-y divide-line">
            {archived.map((habit) => (
              <button
                key={habit.id}
                type="button"
                onClick={() => setEditing(habit)}
                className="pressable flex min-h-12 w-full items-center justify-between px-3 text-left text-muted"
              >
                <span className="truncate">{habit.name}</span>
                <Pencil size={16} aria-hidden />
              </button>
            ))}
          </Card>
        </section>
      )}

      <HabitEditorSheet habit={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function HabitCard({ habit, today, onEdit }: { habit: HabitView; today: string; onEdit: () => void }) {
  const logs = new Map(Object.entries(habit.logs));
  const weekStart = getLocalWeekStart(today);
  const week = Array.from({ length: 7 }, (_, i) => addDaysToLocalDate(weekStart, i));
  const monthStart = `${today.slice(0, 8)}01`;
  const nextMonth = addDaysToLocalDate(`${today.slice(0, 7)}-28`, 4);
  const monthEnd = addDaysToLocalDate(`${nextMonth.slice(0, 8)}01`, -1);
  const monthDays: string[] = [];
  for (let d = monthStart; d <= monthEnd; d = addDaysToLocalDate(d, 1)) monthDays.push(d);
  const leadingBlanks = (new Date(`${monthStart}T12:00:00Z`).getUTCDay() + 6) % 7;

  const current = currentStreak(habit, logs, today);
  const best = bestStreak(habit, logs, today);

  return (
    <Card className="space-y-3 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{habit.name}</p>
          <p className="text-xs text-muted">{frequencyLabel(habit)}</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${habit.name}`}
          className="pressable -mt-1 -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted"
        >
          <Pencil size={18} aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <Metric icon={<Flame size={14} className="text-accent" aria-hidden />} value={current} label="racha" />
        <Metric icon={<Trophy size={14} className="text-primary" aria-hidden />} value={best} label="mejor" />
        <Metric value={percent(completionRate(habit, logs, weekStart, addDaysToLocalDate(weekStart, 6), today))} label="semana" />
        <Metric value={percent(completionRate(habit, logs, monthStart, monthEnd, today))} label="mes" />
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-muted">Esta semana</p>
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((date, i) => {
            const status = dayStatus(habit, logs, date, today);
            return (
              <div key={date} className="flex flex-col items-center gap-1">
                <span className={cn("text-[11px] font-semibold", date === today ? "text-primary" : "text-muted")}>{SHORT_DAYS[i]}</span>
                <span
                  className={cn("h-7 w-7 rounded-full", STATUS_STYLES[status])}
                  role="img"
                  aria-label={`${WEEKDAY_LABELS[(i + 1) % 7]}: ${STATUS_LABELS[status]}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <details className="group">
        <summary className="pressable flex min-h-10 cursor-pointer items-center text-xs font-semibold text-primary">
          Ver el mes
        </summary>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {SHORT_DAYS.map((d, i) => (
            <span key={i} className="text-center text-[10px] font-semibold text-muted">
              {d}
            </span>
          ))}
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {monthDays.map((date) => {
            const status = dayStatus(habit, logs, date, today);
            return (
              <span
                key={date}
                role="img"
                aria-label={`${Number(date.slice(8))}: ${STATUS_LABELS[status]}`}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md text-[10px] font-semibold",
                  STATUS_STYLES[status],
                  status === "done" ? "text-surface" : "text-muted"
                )}
              >
                {Number(date.slice(8))}
              </span>
            );
          })}
        </div>
      </details>
    </Card>
  );
}

function Metric({ icon, value, label }: { icon?: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-1 py-1.5">
      <p className="flex items-center justify-center gap-1 text-base font-bold">
        {icon}
        {value}
      </p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
