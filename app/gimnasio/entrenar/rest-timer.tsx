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
    <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
      <span className="text-sm text-muted">Descanso</span>
      {remaining === null ? (
        <>
          <input
            type="number"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(Number(e.target.value) || 0)}
            className="w-16 rounded border border-line px-1 py-1 text-sm"
          />
          <span className="text-xs text-muted">seg</span>
          <button type="button" onClick={start} className="ml-auto text-sm font-medium text-fg">
            Iniciar
          </button>
        </>
      ) : (
        <>
          <span className={`ml-auto text-lg font-semibold ${isDone ? "text-success" : ""}`}>
            {isDone ? "¡Listo!" : `${remaining}s`}
          </span>
          <button type="button" onClick={stop} className="text-xs text-muted">
            {isDone ? "Cerrar" : "Cancelar"}
          </button>
        </>
      )}
    </div>
  );
}
