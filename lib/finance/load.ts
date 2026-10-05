import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountKind } from "@/app/finanzas/actions";
import type { TransactionKind } from "./summary";

// Lecturas de finanzas para Server Components. `numeric` de Postgres llega como string: se convierte aquí.

export type FinanceAccount = {
  id: string;
  name: string;
  kind: AccountKind;
  color: string;
  initialBalance: number;
  archived: boolean;
  balance: number;
};

export type FinanceCategory = { id: string; name: string; kind: "gasto" | "ingreso"; color: string; archived: boolean };

export type Transaction = {
  id: string;
  kind: TransactionKind;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  localDate: string;
  note: string | null;
};

const PAGE_SIZE = 1000; // límite por respuesta de PostgREST

export async function loadAccounts(supabase: SupabaseClient): Promise<FinanceAccount[]> {
  const [accounts, balances] = await Promise.all([
    supabase
      .from("finance_accounts")
      .select("id, name, kind, color, initial_balance, archived")
      .order("position")
      .order("created_at"),
    supabase.from("finance_account_balances").select("account_id, balance"),
  ]);
  const balanceById = new Map((balances.data ?? []).map((row) => [row.account_id as string, Number(row.balance)]));
  return (accounts.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind as AccountKind,
    color: row.color,
    initialBalance: Number(row.initial_balance),
    archived: row.archived,
    balance: balanceById.get(row.id) ?? Number(row.initial_balance),
  }));
}

export async function loadCategories(supabase: SupabaseClient): Promise<FinanceCategory[]> {
  const { data } = await supabase
    .from("finance_categories")
    .select("id, name, kind, color, archived")
    .order("position")
    .order("created_at");
  return (data ?? []) as FinanceCategory[];
}

/** Movimientos entre dos fechas locales (inclusive), del más reciente al más antiguo. */
export async function loadTransactions(supabase: SupabaseClient, from: string, to: string): Promise<Transaction[]> {
  const rows: Transaction[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, kind, amount, account_id, to_account_id, category_id, local_date, note")
      .gte("local_date", from)
      .lte("local_date", to)
      .order("local_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      rows.push({
        id: row.id,
        kind: row.kind as TransactionKind,
        amount: Number(row.amount),
        accountId: row.account_id,
        toAccountId: row.to_account_id,
        categoryId: row.category_id,
        localDate: row.local_date,
        note: row.note,
      });
    }
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export async function loadBudgets(supabase: SupabaseClient): Promise<Map<string, number>> {
  const { data } = await supabase.from("budgets").select("category_id, monthly_amount");
  return new Map((data ?? []).map((row) => [row.category_id as string, Number(row.monthly_amount)]));
}
