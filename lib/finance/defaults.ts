// Solo servidor (usa crypto de Node y escribe con el cliente de servidor).
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_ACCOUNTS = [{ key: "efectivo", name: "Efectivo", kind: "efectivo", color: "#16a34a" }];

const DEFAULT_CATEGORIES = [
  { key: "comida", name: "Comida", kind: "gasto", color: "#ea580c" },
  { key: "transporte", name: "Transporte", kind: "gasto", color: "#2563eb" },
  { key: "escuela", name: "Escuela", kind: "gasto", color: "#7c3aed" },
  { key: "ocio", name: "Ocio", kind: "gasto", color: "#db2777" },
  { key: "salud", name: "Salud", kind: "gasto", color: "#16a34a" },
  { key: "suscripciones", name: "Suscripciones", kind: "gasto", color: "#0f766e" },
  { key: "ropa", name: "Ropa", kind: "gasto", color: "#ca8a04" },
  { key: "otros-gasto", name: "Otros", kind: "gasto", color: "#64748b" },
  { key: "mesada", name: "Mesada o sueldo", kind: "ingreso", color: "#16a34a" },
  { key: "extra", name: "Ingreso extra", kind: "ingreso", color: "#0f766e" },
  { key: "otros-ingreso", name: "Otros", kind: "ingreso", color: "#64748b" },
];

/** UUID estable por usuario y llave: sembrar dos veces (dos pestañas, reintentos) no duplica. */
function stableId(userId: string, key: string): string {
  const hex = createHash("sha256").update(`${userId}:finance:${key}`).digest("hex");
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Crea la cuenta y las categorías iniciales si el usuario todavía no tiene ninguna. */
export async function ensureFinanceDefaults(supabase: SupabaseClient, userId: string) {
  const [accounts, categories] = await Promise.all([
    supabase.from("finance_accounts").select("id", { head: true, count: "exact" }),
    supabase.from("finance_categories").select("id", { head: true, count: "exact" }),
  ]);

  const inserts: PromiseLike<unknown>[] = [];
  if (accounts.count === 0) {
    inserts.push(
      supabase.from("finance_accounts").upsert(
        DEFAULT_ACCOUNTS.map(({ key, ...account }, position) => ({ ...account, position, id: stableId(userId, key), user_id: userId })),
        { onConflict: "id", ignoreDuplicates: true }
      )
    );
  }
  if (categories.count === 0) {
    inserts.push(
      supabase.from("finance_categories").upsert(
        DEFAULT_CATEGORIES.map(({ key, ...category }, position) => ({ ...category, position, id: stableId(userId, key), user_id: userId })),
        { onConflict: "id", ignoreDuplicates: true }
      )
    );
  }
  await Promise.all(inserts);
}
