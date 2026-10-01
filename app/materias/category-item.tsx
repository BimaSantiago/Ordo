"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Check, ChevronRight, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CATEGORY_COLORS } from "@/lib/schedule/colors";
import { cn } from "@/lib/cn";
import { deleteCategory, setCategoryArchived, updateCategory } from "./actions";

type Category = { id: string; name: string; color: string; type: string; archived: boolean };

export function CategoryItem(category: Category) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="pressable flex min-h-14 w-full items-center gap-3 px-3 text-left"
      >
        <span aria-hidden className="h-8 w-8 shrink-0 rounded-xl" style={{ backgroundColor: category.color }} />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate font-semibold", category.archived && "text-muted line-through")}>
            {category.name}
          </span>
          <span className="block text-xs text-muted">{category.type === "escuela" ? "Escuela" : "Actividad"}</span>
        </span>
        <ChevronRight size={18} className="text-muted" aria-hidden />
      </button>
      <Sheet open={isOpen} onClose={() => setIsOpen(false)} title="Editar materia">
        {isOpen && <CategoryForm category={category} onDone={() => setIsOpen(false)} />}
      </Sheet>
    </>
  );
}

function CategoryForm({ category, onDone }: { category: Category; onDone: () => void }) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const [type, setType] = useState(category.type);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<unknown>) =>
    startTransition(async () => {
      await action();
      onDone();
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateCategory(category.id, { name, color, type }));
      }}
      className="space-y-5 pt-2"
    >
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-muted">Nombre</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary"
        />
      </label>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted">Tipo</p>
        <div className="flex gap-2">
          <Chip selected={type === "escuela"} onClick={() => setType("escuela")}>
            Escuela
          </Chip>
          <Chip selected={type === "actividad"} onClick={() => setType("actividad")}>
            Actividad
          </Chip>
        </div>
      </div>

      <ColorSwatches value={color} onChange={setColor} />

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          disabled={isPending}
          onClick={() => run(() => setCategoryArchived(category.id, !category.archived))}
        >
          {category.archived ? <ArchiveRestore size={18} aria-hidden /> : <Archive size={18} aria-hidden />}
          {category.archived ? "Reactivar" : "Archivar"}
        </Button>
        <Button
          variant="danger"
          disabled={isPending}
          onClick={() => (confirmDelete ? run(() => deleteCategory(category.id)) : setConfirmDelete(true))}
        >
          <Trash2 size={18} aria-hidden />
          {confirmDelete ? "¿Seguro?" : "Eliminar"}
        </Button>
      </div>
      {confirmDelete && (
        <p className="text-sm text-danger">Se borrarán también sus bloques del horario. Las tareas se quedan sin materia.</p>
      )}

      <Button type="submit" block disabled={isPending || !name.trim()} className="min-h-12">
        Guardar
      </Button>
    </form>
  );
}

export function ColorSwatches({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-muted">Color</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
        {CATEGORY_COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            role="radio"
            aria-checked={value === swatch}
            aria-label={`Color ${swatch}`}
            onClick={() => onChange(swatch)}
            className={cn(
              "pressable flex h-11 w-11 items-center justify-center rounded-full text-white",
              value === swatch && "ring-2 ring-fg ring-offset-2 ring-offset-surface"
            )}
            style={{ backgroundColor: swatch }}
          >
            {value === swatch && <Check size={18} aria-hidden />}
          </button>
        ))}
      </div>
    </div>
  );
}
