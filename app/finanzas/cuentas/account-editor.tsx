"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ColorSwatches } from "@/app/materias/category-item";
import { deleteAccount, saveAccount, setAccountArchived, type AccountKind } from "../actions";
import { formatMoney, roundMoney } from "@/lib/finance/money";
import type { FinanceAccount } from "@/lib/finance/load";
import { cn } from "@/lib/cn";
import { createId } from "@/lib/uuid";

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Crédito",
  ahorro: "Ahorro",
};

/** Fila de una cuenta; tocarla abre el editor. */
export function AccountItem({ account }: { account: FinanceAccount }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="pressable flex min-h-14 w-full items-center gap-3 px-3 text-left">
        <span aria-hidden className="h-8 w-8 shrink-0 rounded-xl" style={{ backgroundColor: account.color }} />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate font-semibold", account.archived && "text-muted line-through")}>{account.name}</span>
          <span className="block text-xs text-muted">{ACCOUNT_KIND_LABELS[account.kind]}</span>
        </span>
        <span className={cn("font-semibold tabular-nums", account.balance < 0 && "text-danger")}>{formatMoney(account.balance)}</span>
        <ChevronRight size={18} className="text-muted" aria-hidden />
      </button>
      <Sheet open={isOpen} onClose={() => setIsOpen(false)} title="Editar cuenta">
        {isOpen && <AccountForm account={account} onDone={() => setIsOpen(false)} />}
      </Sheet>
    </>
  );
}

export function NewAccountButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" block onClick={() => setIsOpen(true)} className="min-h-12">
        <Plus size={18} aria-hidden />
        Nueva cuenta
      </Button>
      <Sheet open={isOpen} onClose={() => setIsOpen(false)} title="Nueva cuenta">
        {isOpen && <AccountForm onDone={() => setIsOpen(false)} />}
      </Sheet>
    </>
  );
}

function AccountForm({ account, onDone }: { account?: FinanceAccount; onDone: () => void }) {
  const [name, setName] = useState(account?.name ?? "");
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? "debito");
  const [color, setColor] = useState(account?.color ?? "#2563eb");
  // Una tarjeta de crédito con deuda empieza en negativo; aquí se escribe la deuda como positiva.
  const [initial, setInitial] = useState(account ? String(Math.abs(account.initialBalance)) : "");
  const [isDebt, setIsDebt] = useState(account ? account.initialBalance < 0 : false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const initialNumber = initial.trim() === "" ? 0 : Number(initial.replace(/[\s$,]/g, ""));
  const isValid = name.trim().length > 0 && Number.isFinite(initialNumber) && initialNumber >= 0;

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) return setError(result.error ?? "No se pudo guardar.");
      onDone();
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isValid) return;
        run(() =>
          saveAccount({
            id: account?.id ?? createId(),
            name,
            kind,
            color,
            initialBalance: roundMoney(isDebt ? -initialNumber : initialNumber),
          })
        );
      }}
      className="space-y-5 pt-2"
    >
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-muted">Nombre</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="p. ej. BBVA, Nu, Alcancía"
          required
          autoFocus={!account}
          className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary"
        />
      </label>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted">Tipo</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ACCOUNT_KIND_LABELS) as AccountKind[]).map((value) => (
            <Chip
              key={value}
              selected={kind === value}
              onClick={() => {
                setKind(value);
                if (!account) setIsDebt(value === "credito");
              }}
            >
              {ACCOUNT_KIND_LABELS[value]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted">Saldo inicial</p>
        <div className="flex gap-2">
          <label className="flex flex-1 items-center gap-1 rounded-xl border border-line bg-surface px-3 focus-within:border-primary">
            <span className="text-muted" aria-hidden>
              $
            </span>
            <input
              value={initial}
              onChange={(e) => setInitial(e.target.value)}
              placeholder="0"
              inputMode="decimal"
              aria-label="Saldo inicial"
              className="min-h-12 w-full bg-transparent tabular-nums outline-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
            {[false, true].map((debt) => (
              <button
                key={String(debt)}
                type="button"
                aria-pressed={isDebt === debt}
                onClick={() => setIsDebt(debt)}
                className={cn("pressable rounded-lg px-3 text-sm font-semibold", isDebt === debt ? "bg-surface text-primary" : "text-muted")}
              >
                {debt ? "Debo" : "Tengo"}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted">
          Lo que había en la cuenta antes de empezar a registrar. En una tarjeta de crédito, elige &quot;Debo&quot;.
        </p>
      </div>

      <ColorSwatches value={color} onChange={setColor} />

      {account && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() => run(() => setAccountArchived({ id: account.id, archived: !account.archived }))}
          >
            {account.archived ? <ArchiveRestore size={18} aria-hidden /> : <Archive size={18} aria-hidden />}
            {account.archived ? "Reactivar" : "Archivar"}
          </Button>
          <Button
            variant="danger"
            disabled={isPending}
            onClick={() => (confirmDelete ? run(() => deleteAccount({ id: account.id })) : setConfirmDelete(true))}
          >
            <Trash2 size={18} aria-hidden />
            {confirmDelete ? "¿Seguro?" : "Eliminar"}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" block disabled={isPending || !isValid} className="min-h-12">
        {isPending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
