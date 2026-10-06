"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FolderKanban, Lightbulb, Pin, PinOff, Plus, Rocket, StickyNote, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { runOrQueue, type OfflineKind } from "@/components/offline/run-or-queue";
import { useQuickAdd } from "@/components/quick-add/quick-add-provider";
import { formatShortDate } from "@/lib/date";
import { cn } from "@/lib/cn";
import { createId } from "@/lib/uuid";

export type NoteItem = {
  id: string;
  title: string | null;
  body: string;
  pinned: boolean;
  projectId: string | null;
  updatedDate: string;
};
export type IdeaItem = { id: string; title: string; body: string | null; projectId: string | null; createdDate: string };
export type ProjectOption = { id: string; name: string };

type Tab = "notas" | "ideas";

export function NotesView({
  notes,
  ideas,
  projects,
  initialTab,
}: {
  notes: NoteItem[];
  ideas: IdeaItem[];
  projects: ProjectOption[];
  initialTab: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [editingNote, setEditingNote] = useState<NoteItem | "new" | null>(null);
  const [editingIdea, setEditingIdea] = useState<IdeaItem | "new" | null>(null);
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  return (
    <>
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1" role="tablist" aria-label="Notas o ideas">
        {(["notas", "ideas"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "pressable flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold",
              tab === value ? "bg-surface text-primary" : "text-muted"
            )}
          >
            {value === "notas" ? <StickyNote size={16} aria-hidden /> : <Lightbulb size={16} aria-hidden />}
            {value === "notas" ? `Notas (${notes.length})` : `Ideas (${ideas.length})`}
          </button>
        ))}
      </div>

      <Button variant="secondary" block className="min-h-12" onClick={() => (tab === "notas" ? setEditingNote("new") : setEditingIdea("new"))}>
        <Plus size={18} aria-hidden />
        {tab === "notas" ? "Nueva nota" : "Nueva idea"}
      </Button>

      {tab === "notas" &&
        (notes.length === 0 ? (
          <Card className="px-4 py-5 text-center text-sm text-muted">
            Sin notas. Las notas rápidas del botón + también aparecen aquí.
          </Card>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => setEditingNote(note)}
                className="pressable block w-full rounded-2xl border border-line bg-surface px-3 py-2.5 text-left"
              >
                <span className="flex items-start gap-2">
                  <span className="min-w-0 flex-1">
                    {note.title && <span className="block truncate font-semibold">{note.title}</span>}
                    <span className={cn("line-clamp-3 text-sm whitespace-pre-line", note.title && "text-muted")}>{note.body}</span>
                  </span>
                  {note.pinned && <Pin size={16} className="mt-0.5 shrink-0 text-primary" aria-label="Fijada" />}
                </span>
                <span className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                  {formatShortDate(note.updatedDate)}
                  {note.projectId && projectName.has(note.projectId) && (
                    <span className="inline-flex items-center gap-1">
                      <FolderKanban size={12} aria-hidden />
                      {projectName.get(note.projectId)}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        ))}

      {tab === "ideas" &&
        (ideas.length === 0 ? (
          <Card className="px-4 py-5 text-center text-sm text-muted">
            Sin ideas todavía. Anótalas aunque estén a medias; luego puedes convertirlas en proyecto.
          </Card>
        ) : (
          <Card className="divide-y divide-line">
            {ideas.map((idea) => (
              <button
                key={idea.id}
                type="button"
                onClick={() => setEditingIdea(idea)}
                className="pressable flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left"
              >
                <Lightbulb size={18} className={idea.projectId ? "text-muted" : "text-accent"} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{idea.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {idea.projectId ? `Proyecto: ${projectName.get(idea.projectId) ?? "—"}` : idea.body || formatShortDate(idea.createdDate)}
                  </span>
                </span>
              </button>
            ))}
          </Card>
        ))}

      <Sheet open={editingNote !== null} onClose={() => setEditingNote(null)} title={editingNote === "new" ? "Nueva nota" : "Nota"}>
        {editingNote !== null && (
          <NoteForm
            key={editingNote === "new" ? "new" : editingNote.id}
            note={editingNote === "new" ? undefined : editingNote}
            projects={projects}
            onDone={() => setEditingNote(null)}
          />
        )}
      </Sheet>
      <Sheet open={editingIdea !== null} onClose={() => setEditingIdea(null)} title={editingIdea === "new" ? "Nueva idea" : "Idea"}>
        {editingIdea !== null && (
          <IdeaForm
            key={editingIdea === "new" ? "new" : editingIdea.id}
            idea={editingIdea === "new" ? undefined : editingIdea}
            projectName={editingIdea !== "new" && editingIdea.projectId ? projectName.get(editingIdea.projectId) : undefined}
            onDone={() => setEditingIdea(null)}
          />
        )}
      </Sheet>
    </>
  );
}

/** Ejecuta una acción de la cola y muestra el resultado en el aviso del panel rápido. */
function useQueuedAction(onDone: () => void) {
  const { showToast } = useQuickAdd();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run<K extends OfflineKind>(
    kind: K,
    payload: Parameters<typeof runOrQueue<K>>[1],
    label: string,
    message: string,
    afterDone?: () => void
  ) {
    setError(null);
    startTransition(async () => {
      const result = await runOrQueue(kind, payload, label);
      if (result.status === "error") return setError(result.error);
      onDone();
      showToast({ message: result.status === "queued" ? "Sin señal: se guardará al reconectar" : message });
      if (result.status === "done") afterDone?.();
    });
  }
  return { run, error, isPending };
}

function NoteForm({ note, projects, onDone }: { note?: NoteItem; projects: ProjectOption[]; onDone: () => void }) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [projectId, setProjectId] = useState<string | null>(note?.projectId ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { run, error, isPending } = useQueuedAction(onDone);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        run("saveNote", { id: note?.id ?? createId(), title, body, pinned, projectId }, "Nota", note ? "Nota guardada" : "Nota creada");
      }}
      className="space-y-4 pt-2"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título (opcional)"
        aria-label="Título"
        className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 font-semibold outline-none focus:border-primary"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Escribe la nota..."
        aria-label="Nota"
        rows={7}
        autoFocus={!note}
        className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-primary"
      />

      <Chip selected={pinned} onClick={() => setPinned(!pinned)}>
        {pinned ? <Pin size={16} aria-hidden /> : <PinOff size={16} aria-hidden />}
        {pinned ? "Fijada (importante)" : "Fijar como importante"}
      </Chip>

      {projects.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted">Proyecto</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none]">
            <Chip selected={projectId === null} onClick={() => setProjectId(null)}>
              Ninguno
            </Chip>
            {projects.map((project) => (
              <Chip key={project.id} selected={projectId === project.id} onClick={() => setProjectId(project.id)}>
                {project.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {note && (
          <Button
            variant="danger"
            disabled={isPending}
            aria-label={confirmDelete ? "Confirmar eliminar" : "Eliminar"}
            onClick={() => (confirmDelete ? run("deleteNote", { id: note.id }, "Eliminar nota", "Nota eliminada") : setConfirmDelete(true))}
            className="min-h-12"
          >
            <Trash2 size={18} aria-hidden />
            {confirmDelete && "¿Seguro?"}
          </Button>
        )}
        <Button type="submit" block disabled={isPending || !body.trim()} className="min-h-12 flex-1">
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

function IdeaForm({ idea, projectName, onDone }: { idea?: IdeaItem; projectName?: string; onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(idea?.title ?? "");
  const [body, setBody] = useState(idea?.body ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { run, error, isPending } = useQueuedAction(onDone);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        run("saveIdea", { id: idea?.id ?? createId(), title, body }, "Idea", "Idea guardada");
      }}
      className="space-y-4 pt-2"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="La idea en una línea"
        aria-label="Idea"
        autoFocus={!idea}
        className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 font-semibold outline-none focus:border-primary"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Detalles (opcional)"
        aria-label="Detalles"
        rows={4}
        className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-primary"
      />

      {idea && !idea.projectId && (
        <Button
          variant="secondary"
          block
          disabled={isPending}
          onClick={() => {
            const projectId = createId();
            run("promoteIdea", { ideaId: idea.id, projectId }, `Convertir "${idea.title}"`, "Proyecto creado", () =>
              router.push(`/proyectos/${projectId}`)
            );
          }}
        >
          <Rocket size={18} aria-hidden />
          Convertir en proyecto
        </Button>
      )}
      {idea?.projectId && (
        <Link href={`/proyectos/${idea.projectId}`} className="pressable flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">
          <FolderKanban size={16} aria-hidden />
          Ver proyecto {projectName ? `"${projectName}"` : ""}
        </Link>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {idea && (
          <Button
            variant="danger"
            disabled={isPending}
            aria-label={confirmDelete ? "Confirmar eliminar" : "Eliminar"}
            onClick={() => (confirmDelete ? run("deleteIdea", { id: idea.id }, "Eliminar idea", "Idea eliminada") : setConfirmDelete(true))}
            className="min-h-12"
          >
            <Trash2 size={18} aria-hidden />
            {confirmDelete && "¿Seguro?"}
          </Button>
        )}
        <Button type="submit" block disabled={isPending || !title.trim()} className="min-h-12 flex-1">
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
