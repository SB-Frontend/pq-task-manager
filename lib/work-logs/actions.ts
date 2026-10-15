"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { recordActivity } from "@/lib/activity";
import { canSeeTask, NOT_ALLOWED, requireViewer } from "@/lib/auth/scope";
import { formatDuration } from "@/lib/format";
import { tasks } from "@/lib/storage/tasks";
import { workLogs } from "@/lib/storage/work-logs";
import { workLogSchema } from "@/lib/work-logs/schemas";

export interface WorkLogFormState {
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

function readWorkLogForm(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };

  return {
    taskId: text("taskId"),
    date: text("date"),
    minutes: text("hours"),
    description: text("description"),
  };
}

/** Revalidates every page that shows this work log or a total derived from it. */
function revalidateFor(taskId: string, projectId?: string) {
  revalidatePath("/app/work-logs");
  revalidatePath(`/app/tasks/${taskId}`);
  revalidatePath("/app/tasks");
  if (projectId) revalidatePath(`/app/projects/${projectId}`);
}

/**
 * Work logs follow their task: anyone who can see a task may log work against
 * it, and nobody may log work against a task they cannot see. That is the whole
 * rule, and it is checked on the server before the insert.
 */
export async function createWorkLogAction(
  _prevState: WorkLogFormState,
  formData: FormData,
): Promise<WorkLogFormState> {
  const viewer = await requireViewer();

  const parsed = workLogSchema.safeParse(readWorkLogForm(formData));

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  // A work log must never be orphaned: the task has to exist right now.
  const task = await tasks.find(parsed.data.taskId);
  if (!task) {
    return { fieldErrors: { taskId: ["That task does not exist."] } };
  }

  if (!canSeeTask(viewer, task)) {
    return { fieldErrors: { taskId: [NOT_ALLOWED.workLog] } };
  }

  const log = await workLogs.insert({
    ...parsed.data,
    createdAt: new Date().toISOString(),
  });

  await recordActivity({
    type: "work_log_added",
    message: `Logged ${formatDuration(log.minutes)} on "${task.title}"`,
    projectId: task.projectId,
    taskId: task.id,
  });

  revalidateFor(task.id, task.projectId);
  // redirect() throws, so it must sit outside any try/catch.
  redirect(`/app/tasks/${task.id}`);
}

export async function updateWorkLogAction(
  id: string,
  _prevState: WorkLogFormState,
  formData: FormData,
): Promise<WorkLogFormState> {
  const viewer = await requireViewer();

  const existing = await workLogs.find(id);
  if (!existing) {
    return { message: "This work log no longer exists." };
  }

  // Both ends are checked: the task the log is on now, and the task it would
  // move to. Neither may be a task the viewer cannot see.
  const currentTask = await tasks.find(existing.taskId);
  if (currentTask && !canSeeTask(viewer, currentTask)) {
    return { message: NOT_ALLOWED.workLog };
  }

  const parsed = workLogSchema.safeParse(readWorkLogForm(formData));

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const task = await tasks.find(parsed.data.taskId);
  if (!task) {
    return { fieldErrors: { taskId: ["That task does not exist."] } };
  }

  if (!canSeeTask(viewer, task)) {
    return { fieldErrors: { taskId: [NOT_ALLOWED.workLog] } };
  }

  const updated = await workLogs.update(id, parsed.data);
  if (!updated) {
    return { message: "This work log no longer exists." };
  }

  await recordActivity({
    type: "work_log_updated",
    message: `Updated a work log on "${task.title}"`,
    projectId: task.projectId,
    taskId: task.id,
  });

  revalidateFor(task.id, task.projectId);
  // A log moved between tasks changes the old task's total too.
  if (existing.taskId !== task.id) revalidatePath(`/app/tasks/${existing.taskId}`);

  redirect(`/app/tasks/${task.id}`);
}

/**
 * Removes one work log. The task and project it belonged to are untouched -
 * only the entry itself goes.
 */
export async function deleteWorkLogAction(id: string): Promise<void> {
  const viewer = await requireViewer();

  const log = await workLogs.find(id);
  if (!log) return;

  const task = await tasks.find(log.taskId);
  // Void action: refuses by doing nothing.
  if (task && !canSeeTask(viewer, task)) return;

  await workLogs.remove(id);

  await recordActivity({
    type: "work_log_deleted",
    message: task
      ? `Deleted a work log on "${task.title}"`
      : "Deleted a work log",
    projectId: task?.projectId,
    taskId: task?.id,
  });

  revalidateFor(log.taskId, task?.projectId);
}
