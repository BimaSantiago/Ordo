"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ColorSwatches } from "@/app/materias/category-item";
import { deleteFinanceCategory, saveBudget, saveFinanceCategory, setFinanceCategoryArchived } from "../actions";
import { formatMoney, parseAmount, toAmountInput } from "@/lib/finance/money";
import type { FinanceCategory } from "@/lib/finance/load";
import { cn } from "@/lib/cn";
import { createId } from "@/lib/uuid";

type Kind = FinanceCategory["kind"];

/** Fila de categoría con su límite mensual (solo gastos); tocarla abre el editor. */
export function FinanceCategoryItem({ category, budget }: { category: FinanceCategory; budget: number | null }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="pressable flex min-h-14 w-full items-center gap-3 px-3 text-left">
        <span aria-hidden className="h-8 w-8 shrink-0 rounded-xl" style={{ backgroundColor: category.color }} />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate font-semibold", category.archived && "text-muted line-through")}>{category.name}</span>
          {category.kind === "gasto" && (
            <span className="block text-xs text-muted">{budget ? `Límite ${formatMoney(budget, { round: true })} al mes` : "Sin límite"}</span>
          )}
        </span>
        <ChevronRight size={18} className="text-muted" aria-hidden />
      </button>
      <Sheet open={isOpen} onClose={() => setIsOpen(false)} title="Editar categoría">
        {isOpen && <CategoryForm category={category} budget={budget} kind={category.kind} onDone={() => setIsOpen(false)} />}
      </Sheet>
    </>
  );
}

export function NewFinanceCategoryButton({ kind }: { kind: Kind }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="pressable flex min-h-12 w-full items-center gap-2 px-3 text-sm font-semibold text-primary"
      >
        <Plus size={18} aria-hidden />
        {kind === "gasto" ? "Nueva categoría de gasto" : "Nueva categoría de ingreso"}
      </button>
      <Sheet open={isOpen} onClose={() => setIsOpen(false)} title="Nueva categoría">
        {isOpen && <CategoryForm kind={kind} budget={null} onDone={() => setIsOpen(false)} />}
      </Sheet>
    </>
  );
}

function CategoryForm({
  category,
  kind,
  budget,
  onDone,
}: {
  category?: FinanceCategory;
  kind: Kind;
  budget: number | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? "#0f766e");
  const [limit, setLimit] = useState(budget ? toAmountInput(budget) : "");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const parsedLimit = limit.trim() === "" ? null : parseAmount(limit);
  const limitInvalid = limit.trim() !== "" && parsedLimit === null;

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
        if (!name.trim() || limitInvalid) return;
        run(async () => {
          const id = category?.id ?? createId();
          const saved = await saveFinanceCategory({ id, name, kind, color });
          if (!saved.ok || kind !== "gasto" || parsedLimit === budget) return saved;
          return saveBudget({ categoryId: id, monthlyAmount: parsedLimit });
        });
      }}
      className="space-y-5 pt-2"
    >
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-muted">Nombre</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus={!category}
          className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary"
        />
      </label>

      {kind === "gasto" && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted">Límite mensual (opcional)</p>
          <label className="flex items-center gap-1 rounded-xl border border-line bg-surface px-3 focus-within:border-primary">
            <span className="text-muted" aria-hidden>
              $
            </span>
            <input
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="Sin límite"
              inputMode="decimal"
              aria-label="Límite mensual"
              aria-invalid={limitInvalid}
              className="min-h-12 w-full bg-transparent tabular-nums outline-none"
            />
          </label>
          <p className={cn("text-xs", limitInvalid ? "text-danger" : "text-muted")}>
            {limitInvalid ? "Escribe un monto válido o déjalo vacío." : "Te avisa al llegar al 80% y al pasarte. Vacío = sin límite."}
          </p>
        </div>
      )}

      <ColorSwatches value={color} onChange={setColor} />

      {category && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() => run(() => setFinanceCategoryArchived({ id: category.id, archived: !category.archived }))}
          >
            {category.archived ? <ArchiveRestore size={18} aria-hidden /> : <Archive size={18} aria-hidden />}
            {category.archived ? "Reactivar" : "Archivar"}
          </Button>
          <Button
            variant="danger"
            disabled={isPending}
            onClick={() => (confirmDelete ? run(() => deleteFinanceCategory({ id: category.id })) : setConfirmDelete(true))}
          >
            <Trash2 size={18} aria-hidden />
            {confirmDelete ? "¿Seguro?" : "Eliminar"}
          </Button>
        </div>
      )}
      {confirmDelete && <p className="text-sm text-danger">Sus movimientos se quedan como &quot;Sin categoría&quot;.</p>}

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" block disabled={isPending || !name.trim() || limitInvalid} className="min-h-12">
        {isPending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
