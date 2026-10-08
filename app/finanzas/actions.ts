"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { MAX_AMOUNT, roundMoney } from "@/lib/finance/money";
import type { TransactionKind } from "@/lib/finance/summary";
import type { ActionResult } from "@/app/tareas/actions";

// Idempotentes (id y fecha del cliente, upsert): saveTransaction y deleteTransaction pasan por la
// cola sin conexión (runOrQueue). Cuentas, categorías y presupuestos se editan con señal.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const ACCOUNT_KINDS = ["efectivo", "debito", "credito", "ahorro"] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number];
export type FinanceAccountOption = { id: string; name: string; kind: AccountKind; color: string };
export type FinanceCategoryOption = { id: string; name: string; kind: "gasto" | "ingreso"; color: string };

async function requireUserId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No autenticado");
  return { supabase, userId: data.user.id };
}

function revalidateFinance() {
  revalidatePath("/finanzas", "layout");
  revalidatePath("/hoy");
}

/** Cuentas y categorías activas para el panel "+" (crea las iniciales la primera vez). */
export async function listFinanceOptions(): Promise<{
  accounts: FinanceAccountOption[];
  categories: FinanceCategoryOption[];
}> {
  const { supabase, userId } = await requireUserId();
  await ensureFinanceDefaults(supabase, userId);
  const [accounts, categories] = await Promise.all([
    supabase
      .from("finance_accounts")
      .select("id, name, kind, color")
      .eq("archived", false)
      .order("position")
      .order("created_at"),
    supabase
      .from("finance_categories")
      .select("id, name, kind, color")
      .eq("archived", false)
      .order("position")
      .order("created_at"),
  ]);
  return {
    accounts: (accounts.data ?? []) as FinanceAccountOption[],
    categories: (categories.data ?? []) as FinanceCategoryOption[],
  };
}

export type TransactionInput = {
  id: string;
  kind: TransactionKind;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  localDate: string;
  note: string;
};

export async function saveTransaction(input: TransactionInput): Promise<ActionResult> {
  if (!["gasto", "ingreso", "transferencia"].includes(input.kind)) return { ok: false, error: "Tipo inválido." };
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > MAX_AMOUNT) {
    return { ok: false, error: "Escribe un monto mayor a cero." };
  }
  if (!DATE_RE.test(input.localDate)) return { ok: false, error: "Fecha inválida." };
  if (!input.accountId) return { ok: false, error: "Elige una cuenta." };

  const isTransfer = input.kind === "transferencia";
  if (isTransfer && !input.toAccountId) return { ok: false, error: "Elige la cuenta destino." };
  if (isTransfer && input.toAccountId === input.accountId) {
    return { ok: false, error: "La cuenta de origen y la de destino deben ser distintas." };
  }

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("transactions").upsert({
    id: input.id,
    user_id: userId,
    kind: input.kind,
    amount: roundMoney(input.amount),
    account_id: input.accountId,
    to_account_id: isTransfer ? input.toAccountId : null,
    category_id: isTransfer ? null : input.categoryId,
    local_date: input.localDate,
    note: input.note.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidateFinance();
  return { ok: true };
}

export async function deleteTransaction(input: { id: string }): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("transactions").delete().eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidateFinance();
  return { ok: true };
}

// Cuentas ---------------------------------------------------------------------

export async function saveAccount(input: {
  id: string;
  name: string;
  kind: AccountKind;
  initialBalance: number;
  color: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Escribe un nombre." };
  if (!ACCOUNT_KINDS.includes(input.kind)) return { ok: false, error: "Tipo de cuenta inválido." };
  if (!Number.isFinite(input.initialBalance) || Math.abs(input.initialBalance) > MAX_AMOUNT) {
    return { ok: false, error: "Saldo inicial inválido." };
  }

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("finance_accounts").upsert({
    id: input.id,
    user_id: userId,
    name,
    kind: input.kind,
    initial_balance: roundMoney(input.initialBalance),
    color: COLOR_RE.test(input.color) ? input.color : "#64748b",
  });
  if (error) return { ok: false, error: error.message };
  revalidateFinance();
  return { ok: true };
}

export async function setAccountArchived(input: { id: string; archived: boolean }): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("finance_accounts").update({ archived: input.archived }).eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidateFinance();
  return { ok: true };
}

export async function deleteAccount(input: { id: string }): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("finance_accounts").delete().eq("id", input.id);
  // 23503 = la cuenta tiene movimientos (on delete restrict).
  if (error?.code === "23503") return { ok: false, error: "Esta cuenta tiene movimientos. Archívala en lugar de eliminarla." };
  if (error) return { ok: false, error: error.message };
  revalidateFinance();
  return { ok: true };
}

// Categorías y presupuestos -----------------------------------------------------

export async function saveFinanceCategory(input: {
  id: string;
  name: string;
  kind: "gasto" | "ingreso";
  color: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Escribe un nombre." };
  if (input.kind !== "gasto" && input.kind !== "ingreso") return { ok: false, error: "Tipo inválido." };

  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("finance_categories").upsert({
    id: input.id,
    user_id: userId,
    name,
    kind: input.kind,
    color: COLOR_RE.test(input.color) ? input.color : "#64748b",
  });
  if (error) return { ok: false, error: error.message };
  revalidateFinance();
  return { ok: true };
}

export async function setFinanceCategoryArchived(input: { id: string; archived: boolean }): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("finance_categories").update({ archived: input.archived }).eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidateFinance();
  return { ok: true };
}

export async function deleteFinanceCategory(input: { id: string }): Promise<ActionResult> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("finance_categories").delete().eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidateFinance();
  return { ok: true };
}

/** Límite mensual de una categoría de gasto; `null` lo quita. */
export async function saveBudget(input: { categoryId: string; monthlyAmount: number | null }): Promise<ActionResult> {
  const { supabase, userId } = await requireUserId();

  if (input.monthlyAmount === null) {
    const { error } = await supabase.from("budgets").delete().eq("category_id", input.categoryId);
    if (error) return { ok: false, error: error.message };
  } else {
    if (!Number.isFinite(input.monthlyAmount) || input.monthlyAmount <= 0 || input.monthlyAmount > MAX_AMOUNT) {
      return { ok: false, error: "Escribe un límite mayor a cero." };
    }
    const { error } = await supabase
      .from("budgets")
      .upsert(
        { user_id: userId, category_id: input.categoryId, monthly_amount: roundMoney(input.monthlyAmount) },
        { onConflict: "user_id,category_id" }
      );
    if (error) return { ok: false, error: error.message };
  }
  revalidateFinance();
  return { ok: true };
}
