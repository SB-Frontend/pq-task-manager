import "server-only";

import { requireUser } from "@/lib/auth/auth";
import { activities } from "@/lib/storage/activities";
import { projects } from "@/lib/storage/projects";
import { tasks } from "@/lib/storage/tasks";
import { workLogs } from "@/lib/storage/work-logs";
import type {
  Activity,
  Project,
  ProjectStatus,
  Task,
  TaskPriority,
  TaskStatus,
  WorkLog,
} from "@/types";

const RECENT_PROJECTS = 5;
const RECENT_TASKS = 5;
const RECENT_ACTIVITIES = 8;

export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  taskCount: number;
  completedTaskCount: number;
  progress: number;
  targetDate?: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  projectName: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
}

export interface DashboardData {
  projectCounts: Record<"total" | ProjectStatus, number>;
  taskCounts: Record<"total" | TaskStatus, number>;
  loggedMinutes: number;
  workLogCount: number;
  /** Completed tasks / total tasks, across every project. */
  overallProgress: number;
  activeProjects: ProjectSummary[];
  recentTasks: TaskSummary[];
  recentActivity: Activity[];
  /** True when nothing has been created yet, so the page can say so plainly. */
  isEmpty: boolean;
}

function countProjects(all: Project[]): DashboardData["projectCounts"] {
  return {
    total: all.length,
    active: all.filter((project) => project.status === "active").length,
    completed: all.filter((project) => project.status === "completed").length,
    archived: all.filter((project) => project.status === "archived").length,
  };
}

function countTasks(all: Task[]): DashboardData["taskCounts"] {
  return {
    total: all.length,
    pending: all.filter((task) => task.status === "pending").length,
    in_progress: all.filter((task) => task.status === "in_progress").length,
    completed: all.filter((task) => task.status === "completed").length,
    blocked: all.filter((task) => task.status === "blocked").length,
  };
}

function summariseProject(project: Project, tasksByProject: Map<string, Task[]>): ProjectSummary {
  const own = tasksByProject.get(project.id) ?? [];
  const completed = own.filter((task) => task.status === "completed").length;

  return {
    id: project.id,
    name: project.name,
    status: project.status,
    taskCount: own.length,
    completedTaskCount: completed,
    // The same derivation the project pages use: never stored, always computed.
    progress: own.length === 0 ? 0 : Math.round((completed / own.length) * 100),
    targetDate: project.targetDate,
  };
}

function byNewestUpdate(a: { updatedAt: string }, b: { updatedAt: string }): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

function totalMinutes(logs: WorkLog[]): number {
  return logs.reduce((sum, log) => sum + log.minutes, 0);
}

/**
 * Everything the dashboard shows, derived in one pass.
 *
 * Each collection is read exactly once and the relationships are resolved in
 * memory, so adding a project never adds another storage read.
 */
export async function getDashboardData(): Promise<DashboardData> {
  await requireUser();

  const [allProjects, allTasks, allLogs, allActivities] = await Promise.all([
    projects.list(),
    tasks.list(),
    workLogs.list(),
    activities.list(),
  ]);

  // One grouping pass instead of scanning every task per project.
  const tasksByProject = new Map<string, Task[]>();
  for (const task of allTasks) {
    const group = tasksByProject.get(task.projectId);
    if (group) group.push(task);
    else tasksByProject.set(task.projectId, [task]);
  }

  const projectNames = new Map(allProjects.map((project) => [project.id, project.name]));
  const taskCounts = countTasks(allTasks);

  return {
    projectCounts: countProjects(allProjects),
    taskCounts,
    loggedMinutes: totalMinutes(allLogs),
    workLogCount: allLogs.length,
    overallProgress:
      taskCounts.total === 0
        ? 0
        : Math.round((taskCounts.completed / taskCounts.total) * 100),

    activeProjects: allProjects
      .filter((project) => project.status === "active")
      .sort(byNewestUpdate)
      .slice(0, RECENT_PROJECTS)
      .map((project) => summariseProject(project, tasksByProject)),

    recentTasks: allTasks
      .slice()
      .sort(byNewestUpdate)
      .slice(0, RECENT_TASKS)
      .map((task) => ({
        id: task.id,
        title: task.title,
        projectName: projectNames.get(task.projectId) ?? null,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
      })),

    recentActivity: allActivities
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, RECENT_ACTIVITIES),

    isEmpty: allProjects.length === 0 && allTasks.length === 0,
  };
}
