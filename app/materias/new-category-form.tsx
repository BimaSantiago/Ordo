"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CATEGORY_COLORS } from "@/lib/schedule/colors";
import { createCategory } from "./actions";
import { ColorSwatches } from "./category-item";

export function NewCategoryForm({ count }: { count: number }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("escuela");
  const [color, setColor] = useState<string>(CATEGORY_COLORS[count % CATEGORY_COLORS.length]);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.set("name", name);
        formData.set("type", type);
        formData.set("color", color);
        startTransition(async () => {
          await createCategory(formData);
          setName("");
          setColor(CATEGORY_COLORS[(count + 1) % CATEGORY_COLORS.length]);
        });
      }}
      className="space-y-4 p-4"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre (p. ej. Cálculo, Entrenamiento)"
        aria-label="Nombre de la materia"
        enterKeyHint="done"
        required
        className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary"
      />
      <div className="flex gap-2">
        <Chip selected={type === "escuela"} onClick={() => setType("escuela")}>
          Escuela
        </Chip>
        <Chip selected={type === "actividad"} onClick={() => setType("actividad")}>
          Actividad
        </Chip>
      </div>
      <ColorSwatches value={color} onChange={setColor} />
      <Button type="submit" block disabled={isPending || !name.trim()}>
        <Plus size={18} aria-hidden />
        Agregar
      </Button>
    </form>
  );
}
