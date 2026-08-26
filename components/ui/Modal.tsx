"use client";

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";

import { CloseIcon } from "@/components/ui/icons";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

/**
 * Built on the native <dialog> element with showModal(), which gives us a real
 * focus trap, Escape handling, inert background content and focus restoration
 * from the platform rather than from hand-written key handlers.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // A page can render several modals at once (one per row, say), so the title
  // and description ids must be unique or every dialog would be labelled by
  // the first one's heading.
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // showModal() makes the page inert but does not always stop it scrolling.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  /** The dialog element itself is the backdrop, so a click on it is an outside click. */
  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={handleBackdropClick}
      onCancel={(event) => {
        // Escape: close through React state so `open` stays the source of truth.
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-md rounded-lg border border-border bg-card p-0 text-foreground backdrop:bg-black/50"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border p-4">
        <div className="space-y-1">
          <h2 id={titleId} className="text-sm font-semibold">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="text-sm text-muted">
              {description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="-m-1 rounded-md p-1 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>

      {children && <div className="p-4 text-sm">{children}</div>}

      {footer && (
        <div className="flex justify-end gap-2 border-t border-border p-4">{footer}</div>
      )}
    </dialog>
  );
}
