import "server-only";

import {
  canSeeTask,
  readVisibleTasks,
  requireViewer,
  scopeWorkLogs,
} from "@/lib/auth/scope";
import { projects } from "@/lib/storage/projects";
import { tasks } from "@/lib/storage/tasks";
import { workLogs } from "@/lib/storage/work-logs";
import type { Project, Task, WorkLog } from "@/types";

/**
 * A work log with the task it belongs to, and the project reached *through*
 * that task. The project is never stored on the work log itself.
 */
export interface WorkLogWithContext extends WorkLog {
  task: Pick<Task, "id" | "title"> | null;
  project: Pick<Project, "id" | "name"> | null;
}

/** Newest day first; entries logged on the same day keep insertion order. */
function byNewest(a: WorkLog, b: WorkLog): number {
  return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
}

/** Totals are always computed, never stored. */
export function totalMinutes(logs: WorkLog[]): number {
  return logs.reduce((sum, log) => sum + log.minutes, 0);
}

/**
 * Work logs the viewer may see, with task and project resolved for display.
 *
 * Scoped **through the task**: a member sees every log on a task assigned to
 * them, including any logged by someone else before it was reassigned. Work
 * logs record what was done on a task, not who did it — there is no author
 * column — so the task is the only thing there is to scope by.
 */
export async function listWorkLogs(): Promise<WorkLogWithContext[]> {
  const viewer = await requireViewer();

  const [allLogs, visibleTasks, allProjects] = await Promise.all([
    workLogs.list(),
    readVisibleTasks(viewer),
    projects.list(),
  ]);

  return scopeWorkLogs(viewer, allLogs, visibleTasks)
    .sort(byNewest)
    .map((log) => {
      const task = visibleTasks.find((candidate) => candidate.id === log.taskId) ?? null;
      const project = task
        ? (allProjects.find((candidate) => candidate.id === task.projectId) ?? null)
        : null;

      return {
        ...log,
        task: task ? { id: task.id, title: task.title } : null,
        project: project ? { id: project.id, name: project.name } : null,
      };
    });
}

/** Work logs for one task, newest first. Empty when the task is not visible. */
export async function listWorkLogsForTask(taskId: string): Promise<WorkLog[]> {
  const viewer = await requireViewer();

  const task = await tasks.find(taskId);
  if (!task || !canSeeTask(viewer, task)) return [];

  const own = await workLogs.findWhere({ taskId });
  return own.sort(byNewest);
}

/** One work log, or null when it does not exist or its task is not visible. */
export async function getWorkLog(id: string): Promise<WorkLog | null> {
  const viewer = await requireViewer();

  const log = await workLogs.find(id);
  if (!log) return null;

  const task = await tasks.find(log.taskId);
  if (!task || !canSeeTask(viewer, task)) return null;

  return log;
}

/** Tasks offered in the work log form, most recently updated first. */
export async function listSelectableTasks(): Promise<
  { id: string; title: string; projectName: string }[]
> {
  const viewer = await requireViewer();

  const [visibleTasks, allProjects] = await Promise.all([
    readVisibleTasks(viewer),
    projects.list(),
  ]);

  return visibleTasks
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((task) => ({
      id: task.id,
      title: task.title,
      projectName:
        allProjects.find((project) => project.id === task.projectId)?.name ?? "",
    }));
}
