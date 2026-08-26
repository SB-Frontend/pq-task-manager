"use client";

import { useState, useTransition } from "react";

import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { deleteTaskAction } from "@/lib/tasks/actions";

/** Deleting a task is permanent, so it always goes through a confirmation. */
export default function DeleteTaskButton({
  taskId,
  taskTitle,
}: {
  taskId: string;
  taskTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Delete
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => startTransition(() => deleteTaskAction(taskId))}
        title="Delete this task?"
        description={`"${taskTitle}" and its work logs will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete task"
        variant="danger"
        loading={pending}
      />
    </>
  );
}
