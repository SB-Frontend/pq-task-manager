"use client";

import { useState, useTransition } from "react";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { deleteWorkLogAction } from "@/lib/work-logs/actions";

/** Deleting a work log is permanent, so it always goes through a confirmation. */
export default function DeleteWorkLogButton({
  workLogId,
  label,
}: {
  workLogId: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded text-xs text-muted transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
      >
        Delete
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await deleteWorkLogAction(workLogId);
            setOpen(false);
          })
        }
        title="Delete this work log?"
        description={`The entry for ${label} will be permanently removed. The task itself is not affected. This action cannot be undone.`}
        confirmLabel="Delete work log"
        variant="danger"
        loading={pending}
      />
    </>
  );
}
