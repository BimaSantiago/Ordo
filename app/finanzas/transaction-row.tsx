"use client";

import { ArrowLeftRight } from "lucide-react";
import { useQuickAdd } from "@/components/quick-add/quick-add-provider";
import { formatMoney } from "@/lib/finance/money";
import type { Transaction } from "@/lib/finance/load";
import { cn } from "@/lib/cn";

/** Un movimiento de la lista; tocarlo abre el panel "+" para editarlo o eliminarlo. */
export function TransactionRow({
  transaction,
  title,
  subtitle,
  color,
}: {
  transaction: Transaction;
  title: string;
  subtitle: string;
  color: string | null;
}) {
  const { open } = useQuickAdd();
  const isTransfer = transaction.kind === "transferencia";

  return (
    <button
      type="button"
      onClick={() => open({ transaction })}
      className="pressable flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left"
    >
      <span
        aria-hidden
        className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", isTransfer && "bg-surface-2 text-muted")}
        style={isTransfer ? undefined : { backgroundColor: color ?? "var(--muted)" }}
      >
        {isTransfer && <ArrowLeftRight size={16} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted">{subtitle}</span>
      </span>
      <span
        className={cn(
          "shrink-0 font-semibold tabular-nums",
          transaction.kind === "ingreso" && "text-success",
          isTransfer && "text-muted"
        )}
      >
        {transaction.kind === "gasto" ? "−" : transaction.kind === "ingreso" ? "+" : ""}
        {formatMoney(transaction.amount)}
      </span>
    </button>
  );
}
