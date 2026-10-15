import "server-only";

import {
  ownTasksFilter,
  readVisibleTasks,
  requireViewer,
  scopeProjects,
} from "@/lib/auth/scope";
import { projects } from "@/lib/storage/projects";
import { tasks } from "@/lib/storage/tasks";
import { workLogs } from "@/lib/storage/work-logs";
import type { Project, Task, WorkLog } from "@/types";

/**
 * A project plus the counts derived from its tasks.
 *
 * Progress is never stored: it is recomputed from tasks on every read, so it
 * cannot drift out of step with reality.
 *
 * **Derived from the viewer's visible tasks.** For the owner that is every
 * task, so the figures are unchanged. For a member it is their own tasks, so a
 * project reads "1 of 2 complete" describing their work, not the project's
 * total. Counting tasks a member cannot open would tell them how much hidden
 * work exists, which is exactly what scoping is meant to prevent.
 */
export interface ProjectWithStats extends Project {
  taskCount: number;
  completedTaskCount: number;
  progress: number;
  /** Sum of the work logs of this project's visible tasks. Derived, never stored. */
  loggedMinutes: number;
}

function withStats(
  project: Project,
  scopedTasks: Task[],
  allLogs: WorkLog[],
): ProjectWithStats {
  const own = scopedTasks.filter((task) => task.projectId === project.id);
  const completed = own.filter((task) => task.status === "completed").length;

  // Work logs reach the project through their task, never by storing a project id.
  const ownTaskIds = new Set(own.map((task) => task.id));
  const loggedMinutes = allLogs
    .filter((log) => ownTaskIds.has(log.taskId))
    .reduce((sum, log) => sum + log.minutes, 0);

  return {
    ...project,
    taskCount: own.length,
    completedTaskCount: completed,
    progress: own.length === 0 ? 0 : Math.round((completed / own.length) * 100),
    loggedMinutes,
  };
}

/**
 * Projects for the list page, newest activity first.
 * Archived projects are excluded unless they are explicitly asked for.
 *
 * A member sees only projects holding at least one task assigned to them.
 */
export async function listProjects(
  { archived = false }: { archived?: boolean } = {},
): Promise<ProjectWithStats[]> {
  const viewer = await requireViewer();

  // Read tasks once and group in memory rather than querying per project.
  const [allProjects, visibleTasks, allLogs] = await Promise.all([
    projects.list(),
    readVisibleTasks(viewer),
    workLogs.list(),
  ]);

  return scopeProjects(viewer, allProjects, visibleTasks)
    .filter((project) =>
      archived ? project.status === "archived" : project.status !== "archived",
    )
    .map((project) => withStats(project, visibleTasks, allLogs))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * One project with its stats, or null when the id matches nothing **or the
 * viewer has no task in it**. Null becomes the ordinary not-found page, so a
 * project a member has no work in is indistinguishable from one that does not
 * exist.
 */
export async function getProject(id: string): Promise<ProjectWithStats | null> {
  const viewer = await requireViewer();

  const project = await projects.find(id);
  if (!project) return null;

  const projectTasks = await tasks.findWhere({
    projectId: id,
    ...ownTasksFilter(viewer),
  });

  // A member with no task in this project has no claim to it at all.
  if (!viewer.isOwner && projectTasks.length === 0) return null;

  const allLogs = await workLogs.list();
  return withStats(project, projectTasks, allLogs);
}

/** How many projects are archived **and visible**, so the list can offer the view. */
export async function countArchivedProjects(): Promise<number> {
  const viewer = await requireViewer();

  if (viewer.isOwner) {
    const archived = await projects.findWhere({ status: "archived" });
    return archived.length;
  }

  const [archived, visibleTasks] = await Promise.all([
    projects.findWhere({ status: "archived" }),
    readVisibleTasks(viewer),
  ]);

  return scopeProjects(viewer, archived, visibleTasks).length;
}
