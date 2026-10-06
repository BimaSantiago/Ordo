"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { QuickAddSheet } from "./quick-add-sheet";
import type { EditableTransaction } from "@/components/finance/money-form";

export type QuickAddTab = "tarea" | "actividad" | "dinero" | "habito" | "peso" | "nota";

export type EditableTask = {
  id: string;
  title: string;
  dueDate: string;
  categoryId: string | null;
  startTime: string | null;
  endTime: string | null;
  remindAt: string | null;
};

/** Valores con los que se abre el panel (la celda tocada en la tabla, el día de hoy, una tarea a editar...). */
export type QuickAddPrefill = {
  tab?: QuickAddTab;
  dueDate?: string;
  startTime?: string;
  categoryId?: string | null;
  /** Proyecto para la tarea nueva (desde la página del proyecto). */
  projectId?: string;
  task?: EditableTask;
  /** Movimiento de dinero a editar o eliminar (abre la pestaña Dinero). */
  transaction?: EditableTransaction;
};

type Toast = { message: string; undo?: () => void };

type QuickAddContextValue = {
  open: (prefill?: QuickAddPrefill) => void;
  showToast: (toast: Toast) => void;
};

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

export function useQuickAdd(): QuickAddContextValue {
  const context = useContext(QuickAddContext);
  if (!context) throw new Error("useQuickAdd debe usarse dentro de <QuickAddProvider>");
  return context;
}

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [prefill, setPrefill] = useState<QuickAddPrefill | null>(null);
  const [openKey, setOpenKey] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback((value: QuickAddPrefill = {}) => {
    setPrefill(value);
    setOpenKey((key) => key + 1);
  }, []);

  const showToast = useCallback((value: Toast) => {
    setToast(value);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const value = useMemo(() => ({ open, showToast }), [open, showToast]);

  return (
    <QuickAddContext.Provider value={value}>
      {children}
      <QuickAddSheet prefill={prefill} openKey={openKey} onClose={() => setPrefill(null)} onSaved={showToast} />
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4"
      >
        {toast && (
          <div className="pointer-events-auto flex min-h-12 items-center gap-4 rounded-2xl bg-fg px-4 text-sm font-medium text-canvas">
            <span>{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
                className="pressable min-h-11 font-bold text-accent"
              >
                Deshacer
              </button>
            )}
          </div>
        )}
      </div>
    </QuickAddContext.Provider>
  );
}
