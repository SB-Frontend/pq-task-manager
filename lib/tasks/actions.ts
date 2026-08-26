"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { recordActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth/auth";
import { formatDate, today } from "@/lib/format";
import { projects } from "@/lib/storage/projects";
import { tasks } from "@/lib/storage/tasks";
import { users } from "@/lib/storage/users";
import { workLogs } from "@/lib/storage/work-logs";
import { taskSchema, type TaskInput } from "@/lib/tasks/schemas";
import type { Task, TaskStatus } from "@/types";

export interface TaskFormState {
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

/** Untouched optional inputs arrive as "" and must become undefined. */
function readTaskForm(formData: FormData) {
  const optional = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== "" ? value : undefined;
  };

  return {
    title: formData.get("title") ?? "",
    projectId: formData.get("projectId") ?? "",
    assigneeId: optional("assigneeId"),
    description: optional("description"),
    status: formData.get("status") ?? "pending",
    priority: formData.get("priority") ?? "medium",
    estimatedMinutes: optional("estimatedHours"),
    actualMinutes: optional("actualHours"),
    tags: optional("tags"),
    notes: optional("notes"),
    dueDate: optional("dueDate"),
    startedAt: optional("startedAt"),
    completedAt: optional("completedAt"),
  };
}

/**
 * Status side effects from the specification, kept deliberately simple:
 * a date is only ever filled in when it is empty, so a date typed by hand is
 * never overwritten and no confirmation is needed.
 */
function applyStatusDates(input: TaskInput, previousStatus?: TaskStatus): TaskInput {
  const next = { ...input };

  if (next.status === "in_progress" && !next.startedAt) {
    next.startedAt = today();
  }

  if (next.status === "completed" && !next.completedAt) {
    next.completedAt = today();
  }

  // Reopened: a task that is no longer complete should not keep a completion
  // date. The date it had is preserved in the activity history instead.
  if (previousStatus === "completed" && next.status !== "completed") {
    next.completedAt = undefined;
  }

  return next;
}

async function projectExists(id: string): Promise<boolean> {
  return (await projects.find(id)) !== null;
}

/** Unassigned is valid; a named assignee must actually exist. */
async function assigneeIsValid(id: string | undefined): Promise<boolean> {
  if (!id) return true;
  return (await users.find(id)) !== null;
}

/** Assignment changes are worth recording; other edits are covered elsewhere. */
async function recordAssignmentChange(
  before: Task | null,
  after: Task,
): Promise<void> {
  if (before?.assigneeId === after.assigneeId) return;

  const assignee = after.assigneeId ? await users.find(after.assigneeId) : null;

  await recordActivity({
    type: "task_assigned",
    message: assignee
      ? `Assigned "${after.title}" to ${assignee.name}`
      : `Unassigned "${after.title}"`,
    projectId: after.projectId,
    taskId: after.id,
  });
}

export async function createTaskAction(
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  await requireUser();

  const parsed = taskSchema.safeParse(readTaskForm(formData));

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  if (!(await projectExists(parsed.data.projectId))) {
    return { fieldErrors: { projectId: ["That project does not exist."] } };
  }

  if (!(await assigneeIsValid(parsed.data.assigneeId))) {
    return { fieldErrors: { assigneeId: ["That user does not exist."] } };
  }

  const now = new Date().toISOString();
  const task = await tasks.insert({
    ...applyStatusDates(parsed.data),
    createdAt: now,
    updatedAt: now,
  });

  await recordActivity({
    type: "task_created",
    message: `Created task "${task.title}"`,
    projectId: task.projectId,
    taskId: task.id,
  });

  await recordAssignmentChange(null, task);

  revalidatePath("/app/tasks");
  revalidatePath(`/app/projects/${task.projectId}`);
  // redirect() throws, so it must sit outside any try/catch.
  redirect(`/app/tasks/${task.id}`);
}

export async function updateTaskAction(
  id: string,
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  await requireUser();

  const existing = await tasks.find(id);
  if (!existing) {
    return { message: "This task no longer exists." };
  }

  const parsed = taskSchema.safeParse(readTaskForm(formData));

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  if (!(await projectExists(parsed.data.projectId))) {
    return { fieldErrors: { projectId: ["That project does not exist."] } };
  }

  if (!(await assigneeIsValid(parsed.data.assigneeId))) {
    return { fieldErrors: { assigneeId: ["That user does not exist."] } };
  }

  // Cleared optional fields are spread in as undefined, which removes them from
  // the stored record rather than leaving a stale value behind.
  const updated = await tasks.update(id, {
    ...applyStatusDates(parsed.data, existing.status),
    updatedAt: new Date().toISOString(),
  });

  if (!updated) {
    return { message: "This task no longer exists." };
  }

  await recordTaskChange(existing, updated);
  await recordAssignmentChange(existing, updated);

  revalidatePath("/app/tasks");
  revalidatePath(`/app/tasks/${id}`);
  revalidatePath(`/app/projects/${updated.projectId}`);
  // A task that moved between projects changes both projects' progress.
  if (existing.projectId !== updated.projectId) {
    revalidatePath(`/app/projects/${existing.projectId}`);
  }

  redirect(`/app/tasks/${id}`);
}

/** One entry per update: the status change if there was one, otherwise a plain edit. */
async function recordTaskChange(before: Task, after: Task): Promise<void> {
  if (before.status === after.status) {
    await recordActivity({
      type: "task_updated",
      message: `Updated task "${after.title}"`,
      projectId: after.projectId,
      taskId: after.id,
    });
    return;
  }

  if (after.status === "completed") {
    await recordActivity({
      type: "task_completed",
      message: `Completed task "${after.title}"`,
      projectId: after.projectId,
      taskId: after.id,
    });
    return;
  }

  const reopened =
    before.status === "completed" && before.completedAt
      ? ` (was completed ${formatDate(before.completedAt)})`
      : "";

  await recordActivity({
    type: "task_status_changed",
    message: `Changed "${after.title}" to ${after.status.replace("_", " ")}${reopened}`,
    projectId: after.projectId,
    taskId: after.id,
  });
}

/**
 * Tasks are deleted outright: unlike projects, there is no archive requirement.
 * Work logs belonging to the task go with it so no orphans are left behind.
 */
export async function deleteTaskAction(id: string): Promise<void> {
  await requireUser();

  const task = await tasks.find(id);
  if (!task) return;

  await workLogs.removeWhere({ taskId: id });
  await tasks.remove(id);

  await recordActivity({
    type: "task_deleted",
    message: `Deleted task "${task.title}"`,
    projectId: task.projectId,
  });

  revalidatePath("/app/tasks");
  revalidatePath(`/app/projects/${task.projectId}`);
  redirect("/app/tasks");
}
