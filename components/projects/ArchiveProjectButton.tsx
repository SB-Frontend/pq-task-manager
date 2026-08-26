"use client";

import { useState, useTransition } from "react";

import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { archiveProjectAction } from "@/lib/projects/actions";

/**
 * Archiving is not destructive, but it does remove the project from the default
 * list, so it is still confirmed before it happens.
 */
export default function ArchiveProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Archive
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => startTransition(() => archiveProjectAction(projectId))}
        title="Archive this project?"
        description={`"${projectName}" will be hidden from the project list. Nothing is deleted, and you can restore it by setting its status back to Active.`}
        confirmLabel="Archive project"
        loading={pending}
      />
    </>
  );
}
