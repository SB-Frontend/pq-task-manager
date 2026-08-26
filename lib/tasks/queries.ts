import "server-only";

import { requireUser } from "@/lib/auth/auth";
import {
  applyTaskQuery,
  EMPTY_TASK_QUERY,
  type TaskQuery,
} from "@/lib/tasks/filters";
import { projects } from "@/lib/storage/projects";
import { tasks } from "@/lib/storage/tasks";
import { users } from "@/lib/storage/users";
import { workLogs } from "@/lib/storage/work-logs";
import type { Project, Task, User, WorkLog } from "@/types";

/** A task with its project and assignee resolved for display. */
export interface TaskWithProject extends Task {
  project: Pick<Project, "id" | "name" | "status"> | null;
  /** Never includes a password hash: only what the UI needs to show a name. */
  assignee: Pick<User, "id" | "name"> | null;
}

function attachRelations(
  task: Task,
  allProjects: Project[],
  allUsers: User[],
): TaskWithProject {
  const project = allProjects.find((candidate) => candidate.id === task.projectId);
  const assignee = task.assigneeId
    ? allUsers.find((candidate) => candidate.id === task.assigneeId)
    : undefined;

  return {
    ...task,
    project: project
      ? { id: project.id, name: project.name, status: project.status }
      : null,
    assignee: assignee ? { id: assignee.id, name: assignee.name } : null,
  };
}

export interface TaskListResult {
  /** Tasks after the query has been applied. */
  tasks: TaskWithProject[];
  /** How many tasks exist in total, so "none yet" and "none match" can differ. */
  totalCount: number;
  /** Projects for the filter dropdown, from the same read. */
  projectOptions: { id: string; name: string }[];
}

/**
 * The global task list, filtered and sorted by `query`.
 *
 * Exactly two storage reads regardless of how many filters are active: tasks
 * and projects are each read once, joined in memory, then filtered in one pass.
 */
export async function listTasks(
  query: TaskQuery = EMPTY_TASK_QUERY,
): Promise<TaskListResult> {
  await requireUser();

  const [allTasks, allProjects, allUsers] = await Promise.all([
    tasks.list(),
    projects.list(),
    users.list(),
  ]);
  const withProject = allTasks.map((task) =>
    attachRelations(task, allProjects, allUsers),
  );

  return {
    tasks: applyTaskQuery(withProject, query),
    totalCount: allTasks.length,
    projectOptions: allProjects
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((project) => ({ id: project.id, name: project.name })),
  };
}

/**
 * Tasks belonging to one project. Reuses the same filter/sort implementation as
 * the global list, so the two can never drift apart.
 */
export async function listTasksForProject(
  projectId: string,
  query: TaskQuery = EMPTY_TASK_QUERY,
): Promise<{ tasks: Task[]; totalCount: number }> {
  await requireUser();

  const own = await tasks.findWhere({ projectId });

  return { tasks: applyTaskQuery(own, query), totalCount: own.length };
}

/** One task with its project, or null when the id matches nothing. */
export async function getTask(id: string): Promise<TaskWithProject | null> {
  await requireUser();

  const task = await tasks.find(id);
  if (!task) return null;

  const [allProjects, allUsers] = await Promise.all([projects.list(), users.list()]);
  return attachRelations(task, allProjects, allUsers);
}

/**
 * Projects offered in the task form. Archived projects are hidden, except the
 * one a task already belongs to, so editing such a task cannot silently move it.
 */
export async function listSelectableProjects(
  currentProjectId?: string,
): Promise<Pick<Project, "id" | "name" | "status">[]> {
  await requireUser();

  const all = await projects.list();

  return all
    .filter(
      (project) => project.status !== "archived" || project.id === currentProjectId,
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((project) => ({ id: project.id, name: project.name, status: project.status }));
}

export interface TaskExportData {
  /** Exactly the tasks the task list is currently showing. */
  tasks: TaskWithProject[];
  /** Work logs belonging to those tasks, for the second worksheet. */
  workLogs: WorkLog[];
  /** Logged minutes per task id. Derived, never stored. */
  loggedMinutesByTask: Map<string, number>;
}

/**
 * The data behind an export, using the same query the page used.
 *
 * Three storage reads regardless of how many tasks match, and the work logs
 * are grouped in one pass rather than fetched per task.
 */
export async function listTasksForExport(
  query: TaskQuery = EMPTY_TASK_QUERY,
): Promise<TaskExportData> {
  await requireUser();

  const [allTasks, allProjects, allLogs, allUsers] = await Promise.all([
    tasks.list(),
    projects.list(),
    workLogs.list(),
    users.list(),
  ]);

  const filtered = applyTaskQuery(
    allTasks.map((task) => attachRelations(task, allProjects, allUsers)),
    query,
  );

  const exportedIds = new Set(filtered.map((task) => task.id));
  const relevantLogs = allLogs.filter((log) => exportedIds.has(log.taskId));

  const loggedMinutesByTask = new Map<string, number>();
  for (const log of relevantLogs) {
    loggedMinutesByTask.set(
      log.taskId,
      (loggedMinutesByTask.get(log.taskId) ?? 0) + log.minutes,
    );
  }

  return { tasks: filtered, workLogs: relevantLogs, loggedMinutesByTask };
}
