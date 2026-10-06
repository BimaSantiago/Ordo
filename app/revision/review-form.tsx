"use client";

import { useRef, useState, useTransition } from "react";
import { Check, CloudOff } from "lucide-react";
import { runOrQueue } from "@/components/offline/run-or-queue";
import { createId } from "@/lib/uuid";
import { cn } from "@/lib/cn";

export type WeeklyReview = { id: string; wins: string; lessons: string; nextFocus: string };

type Fields = Omit<WeeklyReview, "id">;

const PROMPTS: { key: keyof Fields; label: string; placeholder: string }[] = [
  { key: "wins", label: "¿Qué salió bien?", placeholder: "Logros, avances, cosas de las que estás orgulloso..." },
  { key: "lessons", label: "¿Qué no salió y qué aprendiste?", placeholder: "Qué te detuvo y qué harías distinto..." },
  { key: "nextFocus", label: "Enfoque de la semana que viene", placeholder: "Las 1 a 3 cosas que más importan..." },
];

type Status = "idle" | "saving" | "saved" | "queued" | { error: string };

/** Reflexión de la semana: se guarda sola al salir de cada campo (también sin señal). */
export function ReviewForm({ weekStart, review }: { weekStart: string; review: WeeklyReview | null }) {
  const initial: Fields = { wins: review?.wins ?? "", lessons: review?.lessons ?? "", nextFocus: review?.nextFocus ?? "" };
  const [id] = useState(() => review?.id ?? createId());
  const saved = useRef<Fields>(initial);
  const [fields, setFields] = useState<Fields>(initial);
  const [status, setStatus] = useState<Status>("idle");
  const [, startTransition] = useTransition();

  function commit() {
    const current = fields;
    const unchanged = PROMPTS.every(({ key }) => current[key].trim() === saved.current[key].trim());
    if (unchanged) return;
    setStatus("saving");
    startTransition(async () => {
      const result = await runOrQueue("saveWeeklyReview", { id, weekStart, ...current }, "Revisión semanal");
      if (result.status === "error") return setStatus({ error: result.error });
      saved.current = current;
      setStatus(result.status === "queued" ? "queued" : "saved");
    });
  }

  return (
    <div className="space-y-4">
      {PROMPTS.map(({ key, label, placeholder }) => (
        <label key={key} className="block space-y-2">
          <span className="text-sm font-semibold text-muted">{label}</span>
          <textarea
            value={fields[key]}
            onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
            onBlur={commit}
            placeholder={placeholder}
            rows={3}
            className={cn(
              "w-full rounded-xl border bg-surface px-3 py-2.5 outline-none focus:border-primary",
              key === "nextFocus" ? "border-primary/40" : "border-line"
            )}
          />
        </label>
      ))}
      <p className="flex min-h-5 items-center gap-1.5 text-sm text-muted" role="status" aria-live="polite">
        {status === "saving" && "Guardando..."}
        {status === "saved" && (
          <>
            <Check size={16} className="text-success" aria-hidden />
            Guardado
          </>
        )}
        {status === "queued" && (
          <>
            <CloudOff size={16} aria-hidden />
            Sin señal: se guardará al reconectar
          </>
        )}
        {typeof status === "object" && <span className="text-danger">{status.error}</span>}
        {status === "idle" && "Se guarda solo al salir de cada campo."}
      </p>
    </div>
  );
}
