"use client";

import { useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import type { QuickCategory } from "@/app/materias/actions";
import { runOrQueue } from "@/components/offline/run-or-queue";
import { CATEGORY_COLORS } from "@/lib/schedule/colors";
import { cn } from "@/lib/cn";
import { createId } from "@/lib/uuid";

/**
 * Chips de materias con opción "+ Nueva" en línea: se crea y queda seleccionada sin salir
 * del panel en el que estés.
 */
export function CategoryPicker({
  categories,
  value,
  onChange,
  onCreated,
  allowNone = true,
}: {
  categories: QuickCategory[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  onCreated: (category: QuickCategory) => void;
  allowNone?: boolean;
}) {
  // Si la materia es obligatoria y aún no hay ninguna, abrir directo el formulario para crearla.
  const [isCreating, setIsCreating] = useState(!allowNone && categories.length === 0);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function create() {
    if (!name.trim()) return;
    setError(null);
    // El id es del cliente: la materia se puede usar al instante, incluso sin señal (la cola la
    // sube antes que cualquier tarea o bloque que la use, porque respeta el orden).
    const category = { id: createId(), name: name.trim(), color };
    startTransition(async () => {
      const run = await runOrQueue("createCategoryQuick", category, `Materia "${category.name}"`);
      if (run.status === "error") return setError(run.error);
      onCreated(category);
      onChange(category.id);
      setName("");
      setIsCreating(false);
    });
  }

  return (
    <div className="space-y-2">
      <div className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none]">
        {allowNone && (
          <Chip selected={value === null} onClick={() => onChange(null)}>
            Sin materia
          </Chip>
        )}
        {categories.map((category) => (
          <Chip
            key={category.id}
            color={category.color}
            selected={value === category.id}
            onClick={() => onChange(category.id)}
          >
            {category.name}
          </Chip>
        ))}
        <Chip selected={isCreating} onClick={() => setIsCreating((v) => !v)}>
          <Plus size={16} aria-hidden />
          Nueva
        </Chip>
      </div>

      {isCreating && (
        <div className="space-y-2 rounded-2xl bg-surface-2 p-3">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  create();
                }
              }}
              placeholder="Nombre (p. ej. Cálculo)"
              aria-label="Nombre de la nueva materia"
              enterKeyHint="done"
              autoFocus
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={create}
              disabled={isPending || !name.trim()}
              className="pressable min-h-11 rounded-xl bg-primary px-4 font-semibold text-on-primary disabled:opacity-50"
            >
              Crear
            </button>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
            {CATEGORY_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                role="radio"
                aria-checked={color === swatch}
                aria-label={`Color ${swatch}`}
                onClick={() => setColor(swatch)}
                className={cn(
                  "pressable flex h-9 w-9 items-center justify-center rounded-full text-white",
                  color === swatch && "ring-2 ring-fg ring-offset-2 ring-offset-surface-2"
                )}
                style={{ backgroundColor: swatch }}
              >
                {color === swatch && <Check size={16} aria-hidden />}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
