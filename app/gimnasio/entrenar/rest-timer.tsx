"use client";

import { useEffect, useRef, useState } from "react";

export function RestTimer() {
  const [durationSeconds, setDurationSeconds] = useState(90);
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => (r === null ? null : r - 1));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [remaining]);

  const start = () => setRemaining(durationSeconds);
  const stop = () => setRemaining(null);
  const isDone = remaining === 0;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-sm text-slate-500">Descanso</span>
      {remaining === null ? (
        <>
          <input
            type="number"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(Number(e.target.value) || 0)}
            className="w-16 rounded border border-slate-300 px-1 py-1 text-sm"
          />
          <span className="text-xs text-slate-400">seg</span>
          <button type="button" onClick={start} className="ml-auto text-sm font-medium text-slate-900">
            Iniciar
          </button>
        </>
      ) : (
        <>
          <span className={`ml-auto text-lg font-semibold ${isDone ? "text-emerald-600" : ""}`}>
            {isDone ? "¡Listo!" : `${remaining}s`}
          </span>
          <button type="button" onClick={stop} className="text-xs text-slate-500">
            {isDone ? "Cerrar" : "Cancelar"}
          </button>
        </>
      )}
    </div>
  );
}
