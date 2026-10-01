"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { pendingCount, subscribeOutbox, type OutboxItem } from "@/lib/offline/outbox";
import { syncPending } from "./run-or-queue";

type SyncState = {
  online: boolean;
  pending: number;
  syncing: boolean;
  /** Cambios que el servidor rechazó al sincronizar (p. ej. datos inválidos). */
  rejected: { item: OutboxItem; error: string }[];
  dismissRejected: () => void;
  syncNow: () => void;
};

const SyncContext = createContext<SyncState | null>(null);

export function useSync(): SyncState {
  const context = useContext(SyncContext);
  if (!context) throw new Error("useSync debe usarse dentro de <SyncProvider>");
  return context;
}

const RETRY_MS = 30_000;

/** Sincroniza la cola sin conexión al abrir la app, al recuperar señal y cada 30 s si hay pendientes. */
export function SyncProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [rejected, setRejected] = useState<SyncState["rejected"]>([]);
  const pendingRef = useRef(0);

  const refreshCount = useCallback(async () => {
    const count = await pendingCount();
    pendingRef.current = count;
    setPending(count);
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine || pendingRef.current === 0) return;
    setSyncing(true);
    try {
      const result = await syncPending();
      if (result.dropped.length > 0) setRejected((prev) => [...prev, ...result.dropped]);
      // Lo sincronizado ya está en el servidor: refrescar las pantallas con datos reales.
      if (result.synced > 0) router.refresh();
    } finally {
      setSyncing(false);
      await refreshCount();
    }
  }, [refreshCount, router]);

  useEffect(() => {
    const updateOnline = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void syncNow();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncNow();
    };

    const unsubscribe = subscribeOutbox(() => void refreshCount());
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(() => void syncNow(), RETRY_MS);
    // Estado inicial fuera del render (navigator no existe en el servidor).
    const first = setTimeout(() => {
      updateOnline();
      void refreshCount().then(syncNow);
    }, 0);

    return () => {
      unsubscribe();
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
      clearTimeout(first);
    };
  }, [refreshCount, syncNow]);

  const value = useMemo(
    () => ({
      online,
      pending,
      syncing,
      rejected,
      dismissRejected: () => setRejected([]),
      syncNow: () => void syncNow(),
    }),
    [online, pending, syncing, rejected, syncNow]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
