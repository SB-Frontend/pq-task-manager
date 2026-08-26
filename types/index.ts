/**
 * Application data models.
 *
 * These are the shapes persisted by the storage layer and consumed by the UI.
 * They are storage-agnostic on purpose: `id` is a plain string and every date
 * is a string, so the same models work whether the records come from JSON
 * files today or from a database later.
 *
 * Date conventions:
 *   - Timestamps (createdAt, updatedAt) are full ISO 8601 strings,
 *     e.g. "2026-08-24T09:30:00.000Z".
 *   - Calendar-only values (Project.startDate, Project.targetDate,
 *     Task.dueDate, Task.startedAt, Task.completedAt, WorkLog.date) are
 *     "YYYY-MM-DD", so they never shift across time zones. They come from date
 *     inputs and are only ever shown as a day, never a time.
 */

/**
 * Appearance preference. Not stored data - it lives in a cookie - but it is
 * shared between server and client code, so it belongs with the shared types
 * rather than in a server-only module.
 */
export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

/** Every stored record is identified by a prefixed string id. */
export interface BaseRecord {
  id: string;
}

export type ProjectStatus = "active" | "completed" | "archived";

export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";

export type TaskPriority = "low" | "medium" | "high";

export type ActivityType =
  | "project_created"
  | "project_updated"
  | "task_created"
  | "task_updated"
  | "task_status_changed"
  | "task_completed"
  | "task_deleted"
  | "task_assigned"
  | "work_log_added"
  | "work_log_updated"
  | "work_log_deleted";

export interface User extends BaseRecord {
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session extends BaseRecord {
  userId: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * A user as it may be handed to the UI. Deliberately excludes passwordHash so
 * a hash can never reach a client component by accident.
 */
export type PublicUser = Omit<User, "passwordHash">;

export interface Project extends BaseRecord {
  name: string;
  client?: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task extends BaseRecord {
  projectId: string;
  /**
   * Who is working on this task. Collaboration metadata only - it confers no
   * ownership, visibility or permission of any kind. Absent means unassigned.
   */
  assigneeId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  notes?: string;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkLog extends BaseRecord {
  taskId: string;
  date: string;
  minutes: number;
  description: string;
  createdAt: string;
}

export interface Activity extends BaseRecord {
  type: ActivityType;
  message: string;
  projectId?: string;
  taskId?: string;
  createdAt: string;
}
