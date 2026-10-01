/** Paleta para materias: tonos que se leen con texto blanco y funcionan en modo claro y oscuro. */
export const CATEGORY_COLORS = [
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#64748b",
] as const;

/** Abreviatura para las columnas angostas de la tabla semanal ("Cálculo" → "Cál"). */
export function abbreviate(name: string, length = 3): string {
  const words = name.trim().split(/\s+/);
  if (words.length > 1 && words[0].length <= 2) return words.map((w) => w[0]).join("").slice(0, length).toUpperCase();
  return words[0].slice(0, length);
}
