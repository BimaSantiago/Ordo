"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./icon-button";

/**
 * Panel inferior sobre `<dialog>` nativo: el navegador atrapa el foco, cierra con Esc/atrás
 * y pone el fondo inerte, sin librerías.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Tocar el fondo (fuera del contenido) cierra.
        if (e.target === e.currentTarget) onClose();
      }}
      className="sheet m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-3xl bg-surface p-0 text-fg md:m-auto md:max-w-lg md:rounded-3xl"
    >
      <div className="flex max-h-[92dvh] flex-col">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line md:hidden" aria-hidden />
        <div className="flex items-center justify-between gap-2 px-4 pt-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <IconButton aria-label="Cerrar" onClick={onClose} className="-mr-2">
            <X size={22} aria-hidden />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
        {footer && (
          <div className="border-t border-line px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">{footer}</div>
        )}
        {!footer && <div className="pb-[env(safe-area-inset-bottom,0px)]" />}
      </div>
    </dialog>
  );
}
