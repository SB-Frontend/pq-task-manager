import "server-only";

import {
  canSeeTask,
  ownTasksFilter,
  readVisibleTasks,
  requireViewer,
  scopeProjects,
  type Viewer,
} from "@/lib/auth/scope";
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
  knownUsers: Pick<User, "id" | "name">[],
): TaskWithProject {
  const project = allProjects.find((candidate) => candidate.id === task.projectId);
  const assignee = task.assigneeId
    ? knownUsers.find((candidate) => candidate.id === task.assigneeId)
    : undefined;

  return {
    ...task,
    project: project
      ? { id: project.id, name: project.name, status: project.status }
      : null,
    assignee: assignee ? { id: assignee.id, name: assignee.name } : null,
  };
}

/**
 * The names needed to label assignees.
 *
 * An owner may be looking at anyone's task, so they need every name. A member
 * only ever sees their own tasks, so their own name is the only one required —
 * and reading nothing further means no other account's name is even loaded.
 */
async function namesFor(viewer: Viewer): Promise<Pick<User, "id" | "name">[]> {
  return viewer.isOwner ? users.list() : [{ id: viewer.id, name: viewer.name }];
}

export interface TaskListResult {
  /** Tasks after the query has been applied. */
  tasks: TaskWithProject[];
  /** How many tasks the viewer has in total, so "none yet" and "none match" can differ. */
  totalCount: number;
  /** Projects for the filter dropdown, from the same read. */
  projectOptions: { id: string; name: string }[];
}

/**
 * The task list, scoped to the viewer, then filtered and sorted by `query`.
 *
 * Still exactly three storage reads regardless of how many filters are active.
 * Scoping does not add a read: a member's tasks are narrowed by the database in
 * the same query that fetches them, and the project list is derived from the
 * tasks already in hand.
 */
export async function listTasks(
  query: TaskQuery = EMPTY_TASK_QUERY,
): Promise<TaskListResult> {
  const viewer = await requireViewer();

  const [visible, allProjects, knownUsers] = await Promise.all([
    readVisibleTasks(viewer),
    projects.list(),
    namesFor(viewer),
  ]);

  const withProject = visible.map((task) =>
    attachRelations(task, allProjects, knownUsers),
  );

  return {
    tasks: applyTaskQuery(withProject, query),
    totalCount: visible.length,
    // Only projects the viewer can reach, so the filter cannot name a project
    // they have no work in.
    projectOptions: scopeProjects(viewer, allProjects, visible)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((project) => ({ id: project.id, name: project.name })),
  };
}

/**
 * Tasks belonging to one project. Reuses the same filter/sort implementation as
 * the global list, so the two can never drift apart.
 *
 * A member sees only their own tasks here, which is why a project's progress is
 * derived from this same scoped set (see lib/projects/queries.ts): the counts a
 * member is shown describe the work they can actually see.
 */
export async function listTasksForProject(
  projectId: string,
  query: TaskQuery = EMPTY_TASK_QUERY,
): Promise<{ tasks: Task[]; totalCount: number }> {
  const viewer = await requireViewer();

  const own = await tasks.findWhere({ projectId, ...ownTasksFilter(viewer) });

  return { tasks: applyTaskQuery(own, query), totalCount: own.length };
}

/**
 * One task with its project, or null when the id matches nothing **or the
 * viewer may not see it**. The route turns null into its ordinary not-found
 * page, so an id the viewer has no claim to is indistinguishable from an id
 * that was never real.
 */
export async function getTask(id: string): Promise<TaskWithProject | null> {
  const viewer = await requireViewer();

  const task = await tasks.find(id);
  if (!task || !canSeeTask(viewer, task)) return null;

  const [allProjects, knownUsers] = await Promise.all([
    projects.list(),
    namesFor(viewer),
  ]);
  return attachRelations(task, allProjects, knownUsers);
}

/**
 * Projects offered in the task form.
 *
 * For the owner: every project, with archived ones hidden except the one the
 * task already belongs to, so editing such a task cannot silently move it.
 *
 * For a member: only the task's current project, because a member may not move
 * a task between projects. The form renders it as a fixed value, and
 * `updateTaskAction` ignores any project a member submits regardless.
 */
export async function listSelectableProjects(
  currentProjectId?: string,
): Promise<Pick<Project, "id" | "name" | "status">[]> {
  const viewer = await requireViewer();

  const all = await projects.list();

  const selectable = viewer.isOwner
    ? all.filter(
        (project) => project.status !== "archived" || project.id === currentProjectId,
      )
    : all.filter((project) => project.id === currentProjectId);

  return selectable
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
 * The data behind an export, using the same query **and the same scope** the
 * page used. An export can therefore never contain a row its requester could
 * not already see on screen.
 */
export async function listTasksForExport(
  query: TaskQuery = EMPTY_TASK_QUERY,
): Promise<TaskExportData> {
  const viewer = await requireViewer();

  const [visible, allProjects, allLogs, knownUsers] = await Promise.all([
    readVisibleTasks(viewer),
    projects.list(),
    workLogs.list(),
    namesFor(viewer),
  ]);

  const filtered = applyTaskQuery(
    visible.map((task) => attachRelations(task, allProjects, knownUsers)),
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
