/**
 * CSV (RFC 4180) a partir de filas de la base: comillas dobles cuando hace falta, comillas
 * internas duplicadas, null/undefined como celda vacía y arreglos/objetos como JSON.
 * Empieza con BOM para que Excel lo abra en UTF-8 (acentos y ñ bien).
 */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "﻿";
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [columns.map(escapeCell).join(","), ...rows.map((row) => columns.map((c) => escapeCell(row[c])).join(","))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}

function escapeCell(value: unknown): string {
  if (value == null) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replaceAll('"', '""')}"` : text;
}
