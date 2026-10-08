/**
 * Montos en MXN. Se guardan como numeric(12,2) y en el cliente se manejan como número con
 * dos decimales (redondeados aquí), nunca como centavos sueltos.
 */

const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const MXN_ROUND = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

export const MAX_AMOUNT = 9_999_999_999.99;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Interpreta lo que se escribe en el campo de monto: "150", "$1,250.50", "99,5" (coma decimal
 * del teclado de algunos Android) o "1 250". Regresa null si no es un monto positivo válido.
 */
export function parseAmount(input: string): number | null {
  let text = input.replace(/[\s$]/g, "");
  if (!text) return null;

  const hasComma = text.includes(",");
  const hasDot = text.includes(".");
  if (hasComma && hasDot) {
    // "1,250.50": la coma separa miles.
    text = text.replace(/,/g, "");
  } else if (hasComma) {
    // "99,5" o "99,50" es decimal; "1,250" o "1,250,000" son miles.
    text = /^\d+,\d{1,2}$/.test(text) ? text.replace(",", ".") : text.replace(/,/g, "");
  }

  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const value = roundMoney(Number(text));
  if (!Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT) return null;
  return value;
}

/** "$1,250.50"; con `round`, sin centavos ("$1,251") para resúmenes. */
export function formatMoney(value: number, { round = false, signed = false } = {}): string {
  const text = (round ? MXN_ROUND : MXN).format(Math.abs(value));
  if (value < 0) return `−${text}`;
  return signed && value > 0 ? `+${text}` : text;
}

/** Valor para el input al editar: "150" o "150.5" (sin separadores de miles). */
export function toAmountInput(value: number): string {
  return String(roundMoney(value));
}
