import "server-only";

import { requireUser } from "@/lib/auth/auth";
import { projects } from "@/lib/storage/projects";
import { tasks } from "@/lib/storage/tasks";
import { workLogs } from "@/lib/storage/work-logs";
import type { Project, Task, WorkLog } from "@/types";

/**
 * A project plus the counts derived from its tasks.
 *
 * Progress is never stored: it is recomputed from tasks on every read, so it
 * cannot drift out of step with reality.
 */
export interface ProjectWithStats extends Project {
  taskCount: number;
  completedTaskCount: number;
  progress: number;
  /** Sum of the work logs of this project's tasks. Derived, never stored. */
  loggedMinutes: number;
}

function withStats(
  project: Project,
  allTasks: Task[],
  allLogs: WorkLog[],
): ProjectWithStats {
  const own = allTasks.filter((task) => task.projectId === project.id);
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
 */
export async function listProjects(
  { archived = false }: { archived?: boolean } = {},
): Promise<ProjectWithStats[]> {
  await requireUser();

  // Read tasks once and group in memory rather than querying per project.
  const [allProjects, allTasks, allLogs] = await Promise.all([
    projects.list(),
    tasks.list(),
    workLogs.list(),
  ]);

  return allProjects
    .filter((project) =>
      archived ? project.status === "archived" : project.status !== "archived",
    )
    .map((project) => withStats(project, allTasks, allLogs))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** One project with its stats, or null when the id matches nothing. */
export async function getProject(id: string): Promise<ProjectWithStats | null> {
  await requireUser();

  const project = await projects.find(id);
  if (!project) return null;

  const projectTasks = await tasks.findWhere((task) => task.projectId === id);
  const allLogs = await workLogs.list();
  return withStats(project, projectTasks, allLogs);
}

/** How many projects are archived, so the list can offer the archived view. */
export async function countArchivedProjects(): Promise<number> {
  await requireUser();

  const archived = await projects.findWhere((project) => project.status === "archived");
  return archived.length;
}
