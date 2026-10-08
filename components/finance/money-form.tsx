"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowRight, CalendarDays, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { runOrQueue } from "@/components/offline/run-or-queue";
import { listFinanceOptions, type FinanceAccountOption, type FinanceCategoryOption } from "@/app/finanzas/actions";
import { addDaysToLocalDate, formatShortDate, getLocalDateString } from "@/lib/date";
import { formatMoney, parseAmount, toAmountInput } from "@/lib/finance/money";
import type { TransactionKind } from "@/lib/finance/summary";
import { cn } from "@/lib/cn";
import { createId } from "@/lib/uuid";

export type EditableTransaction = {
  id: string;
  kind: TransactionKind;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  localDate: string;
  note: string | null;
};

type Toast = { message: string; undo?: () => void };
type Options = { accounts: FinanceAccountOption[]; categories: FinanceCategoryOption[] };

const OPTIONS_CACHE_KEY = "life-os:finance-options";
const LAST_ACCOUNT_KEY = "life-os:finance-last-account";

const KINDS: { value: TransactionKind; label: string }[] = [
  { value: "gasto", label: "Gasto" },
  { value: "ingreso", label: "Ingreso" },
  { value: "transferencia", label: "Transferencia" },
];

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento: solo no se recuerda.
  }
}

/** Captura de gasto, ingreso o transferencia. Pensado para: monto, un toque en la categoría, Guardar. */
export function MoneyForm({
  transaction,
  defaultKind = "gasto",
  onClose,
  onSaved,
}: {
  transaction?: EditableTransaction;
  defaultKind?: TransactionKind;
  onClose: () => void;
  onSaved: (toast: Toast) => void;
}) {
  const today = getLocalDateString();
  const yesterday = addDaysToLocalDate(today, -1);

  const [options, setOptions] = useState<Options>({ accounts: [], categories: [] });
  const [kind, setKind] = useState<TransactionKind>(transaction?.kind ?? defaultKind);
  const [amount, setAmount] = useState(transaction ? toAmountInput(transaction.amount) : "");
  const [accountId, setAccountId] = useState<string | null>(transaction?.accountId ?? null);
  const [toAccountId, setToAccountId] = useState<string | null>(transaction?.toAccountId ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(transaction?.categoryId ?? null);
  const [localDate, setLocalDate] = useState(transaction?.localDate ?? today);
  const [note, setNote] = useState(transaction?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const apply = (next: Options) => {
      setOptions(next);
      // Cuenta por defecto: la última usada, si sigue activa; si no, la primera.
      setAccountId((current) => {
        if (current) return current;
        const last = readStorage(LAST_ACCOUNT_KEY);
        return next.accounts.find((a) => a.id === last)?.id ?? next.accounts[0]?.id ?? null;
      });
    };
    // Sin señal se usa la última lista conocida.
    listFinanceOptions()
      .then((next) => {
        apply(next);
        writeStorage(OPTIONS_CACHE_KEY, JSON.stringify(next));
      })
      .catch(() => {
        try {
          apply(JSON.parse(readStorage(OPTIONS_CACHE_KEY) ?? "null") ?? { accounts: [], categories: [] });
        } catch {
          apply({ accounts: [], categories: [] });
        }
      });
  }, []);

  const isTransfer = kind === "transferencia";
  const categories = options.categories.filter((c) => c.kind === kind);
  const parsed = parseAmount(amount);
  const canSubmit =
    parsed !== null && Boolean(accountId) && (!isTransfer || (Boolean(toAccountId) && toAccountId !== accountId));

  function selectKind(next: TransactionKind) {
    setKind(next);
    setError(null);
    // La categoría de un gasto no sirve para un ingreso.
    if (!options.categories.some((c) => c.id === categoryId && c.kind === next)) setCategoryId(null);
  }

  function submit() {
    if (parsed === null || !accountId) return;
    setError(null);
    startTransition(async () => {
      const id = transaction?.id ?? createId();
      const label = `${KINDS.find((k) => k.value === kind)?.label} ${formatMoney(parsed)}`;
      const run = await runOrQueue(
        "saveTransaction",
        {
          id,
          kind,
          amount: parsed,
          accountId,
          toAccountId: isTransfer ? toAccountId : null,
          categoryId: isTransfer ? null : categoryId,
          localDate,
          note,
        },
        label
      );
      if (run.status === "error") return setError(run.error);
      writeStorage(LAST_ACCOUNT_KEY, accountId);
      onClose();
      if (run.status === "queued") return onSaved({ message: "Sin señal: se guardará al reconectar" });
      onSaved(
        transaction
          ? { message: "Cambios guardados" }
          : {
              message: `${label} guardado`,
              undo: () => void runOrQueue("deleteTransaction", { id }, `Deshacer ${label}`),
            }
      );
    });
  }

  function remove() {
    if (!transaction) return;
    if (!confirmDelete) return setConfirmDelete(true);
    startTransition(async () => {
      const run = await runOrQueue("deleteTransaction", { id: transaction.id }, "Eliminar movimiento");
      if (run.status === "error") return setError(run.error);
      onClose();
      onSaved({ message: run.status === "queued" ? "Sin señal: se eliminará al reconectar" : "Movimiento eliminado" });
    });
  }

  const isOtherDate = localDate !== today && localDate !== yesterday;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit && !isPending) submit();
      }}
      className="space-y-5"
    >
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1" role="radiogroup" aria-label="Tipo de movimiento">
        {KINDS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={kind === value}
            onClick={() => selectKind(value)}
            className={cn(
              "pressable min-h-11 rounded-xl text-sm font-semibold",
              kind === value ? "bg-surface text-primary" : "text-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-primary">
        <span className="text-2xl font-bold text-muted" aria-hidden>
          $
        </span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          inputMode="decimal"
          enterKeyHint="done"
          aria-label="Monto"
          autoFocus={!transaction}
          className="min-h-14 w-full bg-transparent text-3xl font-bold tabular-nums outline-none"
        />
      </label>

      {!isTransfer && (
        <Field label="Categoría">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Chip
                key={category.id}
                color={category.color}
                selected={categoryId === category.id}
                onClick={() => setCategoryId(categoryId === category.id ? null : category.id)}
              >
                {category.name}
              </Chip>
            ))}
          </div>
        </Field>
      )}

      <Field label={isTransfer ? "De" : "Cuenta"}>
        <AccountChips accounts={options.accounts} value={accountId} onChange={setAccountId} />
      </Field>

      {isTransfer && (
        <Field label="A" icon={<ArrowRight size={14} aria-hidden />}>
          <AccountChips
            accounts={options.accounts.filter((a) => a.id !== accountId)}
            value={toAccountId}
            onChange={setToAccountId}
          />
        </Field>
      )}

      <Field label="Fecha">
        <div className="flex gap-2">
          <Chip selected={localDate === today} onClick={() => setLocalDate(today)}>
            Hoy
          </Chip>
          <Chip selected={localDate === yesterday} onClick={() => setLocalDate(yesterday)}>
            Ayer
          </Chip>
          <label
            className={cn(
              "pressable relative inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium",
              isOtherDate ? "border-primary bg-primary text-on-primary" : "border-line bg-surface"
            )}
          >
            <CalendarDays size={16} aria-hidden />
            {isOtherDate ? formatShortDate(localDate) : "Otra"}
            <input
              type="date"
              value={localDate}
              max={today}
              onChange={(e) => e.target.value && setLocalDate(e.target.value)}
              aria-label="Elegir otra fecha"
              className="absolute inset-0 opacity-0"
            />
          </label>
        </div>
      </Field>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (opcional)"
        aria-label="Nota"
        enterKeyHint="done"
        className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary"
      />

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 flex gap-2 bg-surface px-4 pt-2 pb-[env(safe-area-inset-bottom,0px)]">
        {transaction && (
          <Button
            variant="danger"
            disabled={isPending}
            onClick={remove}
            className="min-h-12"
            aria-label={confirmDelete ? "Confirmar eliminar" : "Eliminar"}
          >
            <Trash2 size={18} aria-hidden />
            {confirmDelete && "¿Seguro?"}
          </Button>
        )}
        <Button type="submit" block disabled={!canSubmit || isPending} className="min-h-12 flex-1">
          {isPending ? "Guardando..." : transaction ? "Guardar cambios" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

function AccountChips({
  accounts,
  value,
  onChange,
}: {
  accounts: FinanceAccountOption[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  if (accounts.length === 0) return <p className="text-sm text-muted">Cargando cuentas…</p>;
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none]">
      {accounts.map((account) => (
        <Chip key={account.id} color={account.color} selected={value === account.id} onClick={() => onChange(account.id)}>
          {account.name}
        </Chip>
      ))}
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-muted">
        {icon}
        {label}
      </p>
      {children}
    </div>
  );
}
