"use client";

import { useState } from "react";

/**
 * Valor que el usuario cambia al momento aunque el servidor todavía no lo sepa (p. ej. un
 * cambio guardado en la cola sin conexión). A diferencia de `useOptimistic`, no se revierte al
 * terminar la acción; cede en cuanto llega un valor distinto del servidor (ya sincronizado o
 * cambiado en otro dispositivo), sin necesidad de efectos.
 */
export function useLocalOverride<T>(serverValue: T): { value: T; set: (value: T) => void } {
  const [local, setLocal] = useState({ base: serverValue, value: serverValue });
  const value = Object.is(local.base, serverValue) ? local.value : serverValue;
  return { value, set: (next: T) => setLocal({ base: serverValue, value: next }) };
}
