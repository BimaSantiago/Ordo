"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // El service worker solo existe en contextos seguros (HTTPS o localhost).
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // En desarrollo el SW va primero a la red (ver public/sw.js) para no servir código viejo.
    const url = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?dev=1";
    navigator.serviceWorker.register(url).catch((error) => {
      console.error("No se pudo registrar el service worker", error);
    });
  }, []);

  return null;
}

/** Borra las copias de pantallas guardadas para uso sin conexión (tienen datos personales). */
export async function clearCachedPages(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  registration?.active?.postMessage("clear-pages");
  if ("caches" in window) await caches.delete("life-os-pages-v1");
}
