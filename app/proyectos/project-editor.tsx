"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useQuickAdd } from "@/components/quick-add/quick-add-provider";
import { createId } from "@/lib/uuid";
import { cn } from "@/lib/cn";
import { deleteProject, saveProject, type ProjectStatus } from "./actions";

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  activo: "Activo",
  pausado: "Pausado",
  terminado: "Terminado",
  archivado: "Archivado",
};

export function NewProjectButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button block className="min-h-12" onClick={() => setIsOpen(true)}>
        <Plus size={18} aria-hidden />
        Nuevo proyecto
      </Button>
      <Sheet open={isOpen} onClose={() => setIsOpen(false)} title="Nuevo proyecto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const id = createId();
            startTransition(async () => {
              const result = await saveProject({ id, name, status: "activo" });
              if (!result.ok) return setError(result.error);
              setIsOpen(false);
              setName("");
              router.push(`/proyectos/${id}`);
            });
          }}
          className="space-y-4 pt-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="p. ej. Feria de ciencias, App de finanzas"
            aria-label="Nombre del proyecto"
            autoFocus
            className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-lg font-medium outline-none focus:border-primary"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" block disabled={isPending || !name.trim()} className="min-h-12">
            {isPending ? "Creando..." : "Crear"}
          </Button>
        </form>
      </Sheet>
    </>
  );
}

/** Edición en línea: el estado se guarda al tocarlo; los textos al salir del campo. */
export function ProjectEditor({
  project,
}: {
  project: { id: string; name: string; status: ProjectStatus; description: string | null; nextSteps: string | null };
}) {
  const router = useRouter();
  const { showToast } = useQuickAdd();
  const [name, setName] = useState(project.name);
  const [status, setStatus] = useState(project.status);
  const [description, setDescription] = useState(project.description ?? "");
  const [nextSteps, setNextSteps] = useState(project.nextSteps ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const save = (fields: Parameters<typeof saveProject>[0]) =>
    startTransition(async () => {
      const result = await saveProject(fields);
      if (!result.ok) showToast({ message: result.error });
    });

  return (
    <div className="space-y-5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== project.name && save({ id: project.id, name })}
        aria-label="Nombre del proyecto"
        className="-mx-1 w-full rounded-lg bg-transparent px-1 text-2xl font-bold tracking-tight outline-none focus:bg-surface"
      />

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Estado">
        {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((value) => (
          <Chip
            key={value}
            selected={status === value}
            onClick={() => {
              setStatus(value);
              save({ id: project.id, status: value });
            }}
          >
            {STATUS_LABELS[value]}
          </Chip>
        ))}
      </div>

      <TextBlock
        label="Próximos pasos"
        placeholder="¿Qué sigue? Una línea por paso."
        value={nextSteps}
        onChange={setNextSteps}
        onCommit={() => nextSteps !== (project.nextSteps ?? "") && save({ id: project.id, nextSteps })}
        rows={4}
        highlight
      />
      <TextBlock
        label="Descripción"
        placeholder="De qué trata, para qué, fecha límite..."
        value={description}
        onChange={setDescription}
        onCommit={() => description !== (project.description ?? "") && save({ id: project.id, description })}
        rows={3}
      />

      <Button
        variant="danger"
        disabled={isPending}
        onClick={() =>
          confirmDelete
            ? startTransition(async () => {
                const result = await deleteProject({ id: project.id });
                if (!result.ok) return showToast({ message: result.error });
                showToast({ message: "Proyecto eliminado" });
                router.push("/proyectos");
              })
            : setConfirmDelete(true)
        }
      >
        <Trash2 size={18} aria-hidden />
        {confirmDelete ? "¿Seguro? Sus tareas y notas se conservan" : "Eliminar proyecto"}
      </Button>
    </div>
  );
}

function TextBlock({
  label,
  placeholder,
  value,
  onChange,
  onCommit,
  rows,
  highlight = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  rows: number;
  highlight?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "w-full rounded-xl border bg-surface px-3 py-2.5 outline-none focus:border-primary",
          highlight ? "border-primary/40" : "border-line"
        )}
      />
    </label>
  );
}
