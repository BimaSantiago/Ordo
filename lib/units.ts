/**
 * Unidades de peso (sección 5 de CLAUDE.md: "kg por defecto, con opción de libras; guardar
 * internamente en kg"). Todo se guarda en kg; esto solo convierte al mostrar y al capturar.
 */
export type WeightUnit = "kg" | "lb";

export const KG_PER_LB = 0.45359237;

/** kg guardados → número en la unidad del usuario (sin redondear). */
export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === "kg" ? kg : kg / KG_PER_LB;
}

/** Número capturado en la unidad del usuario → kg para guardar (sin redondear: la base redondea a 2 decimales). */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value : value * KG_PER_LB;
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Valor para un input editable: con 2 decimales, para que lo que se escribe no "salte" al convertir. */
export function toInputValue(kg: number | null, unit: WeightUnit): number | "" {
  return kg == null ? "" : roundTo(fromKg(kg, unit), 2);
}

const formatters: Record<number, Intl.NumberFormat> = {};

/** "102.5 kg" / "226 lb". `withUnit: false` para cuando la unidad ya está en otra parte. */
export function formatWeight(kg: number, unit: WeightUnit, { decimals = 1, withUnit = true } = {}): string {
  formatters[decimals] ??= new Intl.NumberFormat("es-MX", { maximumFractionDigits: decimals });
  const text = formatters[decimals].format(fromKg(kg, unit));
  return withUnit ? `${text} ${unit}` : text;
}

export function isWeightUnit(value: unknown): value is WeightUnit {
  return value === "kg" || value === "lb";
}
