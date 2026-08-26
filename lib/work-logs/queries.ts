import "server-only";

import { requireUser } from "@/lib/auth/auth";
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

/** Every work log, with task and project resolved for display. */
export async function listWorkLogs(): Promise<WorkLogWithContext[]> {
  await requireUser();

  const [allLogs, allTasks, allProjects] = await Promise.all([
    workLogs.list(),
    tasks.list(),
    projects.list(),
  ]);

  return allLogs.sort(byNewest).map((log) => {
    const task = allTasks.find((candidate) => candidate.id === log.taskId) ?? null;
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

/** Work logs for one task, newest first. */
export async function listWorkLogsForTask(taskId: string): Promise<WorkLog[]> {
  await requireUser();

  const own = await workLogs.findWhere({ taskId });
  return own.sort(byNewest);
}

/** One work log, or null when the id matches nothing. */
export async function getWorkLog(id: string): Promise<WorkLog | null> {
  await requireUser();
  return workLogs.find(id);
}

/** Tasks offered in the work log form, most recently updated first. */
export async function listSelectableTasks(): Promise<
  { id: string; title: string; projectName: string }[]
> {
  await requireUser();

  const [allTasks, allProjects] = await Promise.all([tasks.list(), projects.list()]);

  return allTasks
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((task) => ({
      id: task.id,
      title: task.title,
      projectName:
        allProjects.find((project) => project.id === task.projectId)?.name ?? "",
    }));
}
