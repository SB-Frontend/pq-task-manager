import "server-only";

import { requireUser } from "@/lib/auth/auth";
import { isOwner } from "@/lib/auth/ownership";
import { tasks } from "@/lib/storage/tasks";
import type { Project, PublicUser, Task, WorkLog } from "@/types";

/**
 * Who may see and change what.
 *
 * This module is the **single implementation** of the visibility rule, in the
 * same way lib/tasks/filters.ts is the single implementation of filtering. Every
 * query module and every mutating action derives its answer from here, so the
 * list, the detail page, the dashboard and the Excel export can never disagree
 * about what a person is allowed to see.
 *
 * The rule, in full:
 *
 *   * **The owner** (the oldest account, see lib/auth/ownership.ts) sees and
 *     changes everything. Nothing about the owner's experience changed when
 *     scoping was introduced.
 *   * **A member** sees a task only when it is assigned to them, and sees a
 *     project only when it holds at least one such task. They may edit those
 *     tasks and log work against them. They may not reassign a task, move it to
 *     another project, delete it, or create or change a project.
 *
 * Two deliberate consequences:
 *
 *   * **Unassigned tasks are invisible to members.** Assignment is the grant;
 *     without one there is nothing to see.
 *   * **A record a member may not see is reported as missing, not forbidden.**
 *     Queries return `null` so the route renders its ordinary "not found" page
 *     and answers 404. A "forbidden" response would confirm the id exists.
 */
export interface Viewer extends PublicUser {
  /** True for the oldest account. Owners are unscoped. */
  isOwner: boolean;
}

/** The signed-in viewer, or a redirect to /login. Replaces requireUser(). */
export async function requireViewer(): Promise<Viewer> {
  const user = await requireUser();
  return { ...user, isOwner: await isOwner(user.id) };
}

/**
 * An equality filter selecting the viewer's tasks, for the storage layer.
 *
 * Empty for an owner, so it can be spread into a query unconditionally:
 * `tasks.findWhere({ projectId, ...ownTasksFilter(viewer) })`. A member's reads
 * are narrowed in the database rather than after the fact.
 */
export function ownTasksFilter(viewer: Viewer): { assigneeId?: string } {
  return viewer.isOwner ? {} : { assigneeId: viewer.id };
}

/** Every task the viewer may see, read from storage in one query. */
export async function readVisibleTasks(viewer: Viewer): Promise<Task[]> {
  return viewer.isOwner ? tasks.list() : tasks.findWhere({ assigneeId: viewer.id });
}

/** Narrows an already-loaded list of tasks to the ones the viewer may see. */
export function scopeTasks<T extends Task>(viewer: Viewer, all: T[]): T[] {
  if (viewer.isOwner) return all;
  return all.filter((task) => task.assigneeId === viewer.id);
}

/** Whether one task is visible. Unassigned tasks are owner-only. */
export function canSeeTask(viewer: Viewer, task: Task): boolean {
  return viewer.isOwner || task.assigneeId === viewer.id;
}

/**
 * Whether the viewer may change a task.
 *
 * Identical to visibility today: a member edits exactly the tasks they can see.
 * It is a separate function because the two are separate ideas, and a future
 * read-only state would change this one alone.
 */
export function canEditTask(viewer: Viewer, task: Task): boolean {
  return canSeeTask(viewer, task);
}

/** Only the owner creates projects and tasks, edits projects, or deletes tasks. */
export function canManageProjects(viewer: Viewer): boolean {
  return viewer.isOwner;
}

export function canCreateTasks(viewer: Viewer): boolean {
  return viewer.isOwner;
}

export function canDeleteTasks(viewer: Viewer): boolean {
  return viewer.isOwner;
}

/**
 * Whether the viewer may decide a task's assignee and project.
 *
 * Both are owner-only, and for the same reason: each one moves a task out of
 * the member's own view. Allowing either would let a member make work disappear
 * from their list rather than do it, and would let them hand work to a
 * colleague who never agreed to it.
 */
export function canReassignTasks(viewer: Viewer): boolean {
  return viewer.isOwner;
}

/** The ids of the projects reachable through a set of visible tasks. */
export function projectIdsOf(visible: Task[]): Set<string> {
  return new Set(visible.map((task) => task.projectId));
}

/**
 * Narrows projects to those holding at least one visible task.
 *
 * A member's Projects list is therefore a by-product of their assignments: a
 * project appears when they are given work in it and disappears when that work
 * is taken away or reassigned.
 */
export function scopeProjects(
  viewer: Viewer,
  all: Project[],
  visible: Task[],
): Project[] {
  if (viewer.isOwner) return all;

  const allowed = projectIdsOf(visible);
  return all.filter((project) => allowed.has(project.id));
}

/**
 * Narrows work logs to those belonging to visible tasks.
 *
 * Work logs are scoped **through their task**, never by who wrote them — the
 * record has no author column, and the project is likewise reached through the
 * task rather than stored on the log.
 */
export function scopeWorkLogs<T extends WorkLog>(
  viewer: Viewer,
  logs: T[],
  visible: Task[],
): T[] {
  if (viewer.isOwner) return logs;

  const allowed = new Set(visible.map((task) => task.id));
  return logs.filter((log) => allowed.has(log.taskId));
}

/**
 * Narrows activity history to entries about the viewer's own tasks.
 *
 * A member sees an entry only when it names a task they can see. Project-level
 * entries ("Created project X") are therefore owner-only, and so is
 * "Deleted task X" — that entry deliberately outlives its task (§16), which
 * means it can no longer be checked against an assignee and could otherwise
 * spell out the title of work a member was never given.
 */
export function scopeActivities<T extends { taskId?: string }>(
  viewer: Viewer,
  all: T[],
  visible: Task[],
): T[] {
  if (viewer.isOwner) return all;

  const allowed = new Set(visible.map((task) => task.id));
  return all.filter((entry) => entry.taskId !== undefined && allowed.has(entry.taskId));
}

/** Refusals. Stated plainly, and never revealing whether a record exists. */
export const NOT_ALLOWED = {
  project: "Only the owner of this instance can create or change projects.",
  createTask: "Only the owner of this instance can create tasks.",
  editTask: "You can only edit tasks that are assigned to you.",
  reassignTask: "Only the owner of this instance can change a task's assignee or project.",
  workLog: "You can only log work against tasks that are assigned to you.",
} as const;
