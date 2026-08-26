"use client";

import { useEffect, useRef } from "react";

import Sidebar from "@/components/layout/Sidebar";
import { CloseIcon } from "@/components/ui/icons";
import type { PublicUser } from "@/types";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  user: PublicUser;
}

/**
 * Navigation drawer for small screens.
 *
 * Uses a native <dialog> for the same reason the Modal does: the platform
 * supplies the focus trap, Escape handling and focus restoration.
 */
export default function MobileNav({ open, onClose, user }: MobileNavProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Navigation"
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-0 h-full max-h-none w-72 max-w-[85vw] border-r border-border bg-card p-0 text-foreground backdrop:bg-black/50 lg:hidden"
    >
      <div className="relative h-full">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute right-3 top-4 rounded-md p-1 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
        >
          <CloseIcon className="size-4" />
        </button>

        <Sidebar user={user} onNavigate={onClose} />
      </div>
    </dialog>
  );
}
