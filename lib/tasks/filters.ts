import { z } from "zod";

import { today } from "@/lib/format";
import type { Task, TaskPriority, TaskStatus } from "@/types";

export const TASK_SORTS = ["updated", "created", "priority", "status"] as const;
export type TaskSort = (typeof TASK_SORTS)[number];

export const DUE_FILTERS = ["any", "overdue", "today", "week", "none"] as const;
export type DueFilter = (typeof DUE_FILTERS)[number];

const TASK_STATUSES = ["pending", "in_progress", "completed", "blocked"] as const;
const TASK_PRIORITIES = ["low", "medium", "high"] as const;

/** The assignee filter accepts a user id, or "none" for unassigned tasks. */
export const UNASSIGNED = "none";

/** "" means "no filter" for the optional fields. */
export interface TaskQuery {
  q: string;
  projectId: string;
  assigneeId: string;
  status: TaskStatus | "";
  priority: TaskPriority | "";
  due: DueFilter;
  sort: TaskSort;
}

export const EMPTY_TASK_QUERY: TaskQuery = {
  q: "",
  projectId: "",
  assigneeId: "",
  status: "",
  priority: "",
  due: "any",
  sort: "updated",
};

/**
 * An unrecognised value falls back to its default rather than throwing: a URL
 * is user-editable, and `?status=banana` should show everything, not an error.
 */
const querySchema = z.object({
  q: z.string().trim().max(100).catch(""),
  project: z.string().trim().max(100).catch(""),
  assignee: z.string().trim().max(100).catch(""),
  status: z.union([z.enum(TASK_STATUSES), z.literal("")]).catch(""),
  priority: z.union([z.enum(TASK_PRIORITIES), z.literal("")]).catch(""),
  due: z.enum(DUE_FILTERS).catch("any"),
  sort: z.enum(TASK_SORTS).catch("updated"),
});

type RawSearchParams = Record<string, string | string[] | undefined>;

/** A repeated parameter (?status=a&status=b) resolves to the first value. */
function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parseTaskQuery(params: RawSearchParams): TaskQuery {
  const parsed = querySchema.parse({
    q: first(params.q),
    project: first(params.project),
    assignee: first(params.assignee),
    status: first(params.status),
    priority: first(params.priority),
    due: first(params.due),
    sort: first(params.sort),
  });

  return {
    q: parsed.q,
    projectId: parsed.project,
    assigneeId: parsed.assignee,
    status: parsed.status,
    priority: parsed.priority,
    due: parsed.due,
    sort: parsed.sort,
  };
}

/** True when anything is narrowing or re-ordering the list. */
export function hasActiveFilters(query: TaskQuery): boolean {
  return (
    query.q !== "" ||
    query.projectId !== "" ||
    query.assigneeId !== "" ||
    query.status !== "" ||
    query.priority !== "" ||
    query.due !== "any" ||
    query.sort !== "updated"
  );
}

/** Calendar arithmetic on "YYYY-MM-DD" without ever building a UTC date. */
function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(year, month - 1, day + days);

  return [
    shifted.getFullYear(),
    String(shifted.getMonth() + 1).padStart(2, "0"),
    String(shifted.getDate()).padStart(2, "0"),
  ].join("-");
}

/** What the filters need: a task, plus the names it can be searched by. */
export type FilterableTask = Task & {
  project?: { name: string } | null;
  assignee?: { name: string } | null;
};

function matchesSearch(task: FilterableTask, term: string): boolean {
  const haystack = [
    task.title,
    task.description ?? "",
    task.project?.name ?? "",
    task.assignee?.name ?? "",
    task.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(term);
}

function matchesDue(task: FilterableTask, due: DueFilter): boolean {
  if (due === "any") return true;
  if (due === "none") return !task.dueDate;
  if (!task.dueDate) return false;

  const now = today();

  switch (due) {
    case "overdue":
      // A finished task is not chased for being late.
      return task.dueDate < now && task.status !== "completed";
    case "today":
      return task.dueDate === now;
    case "week":
      return task.dueDate >= now && task.dueDate <= addDays(now, 6);
  }
}

/** Lower rank sorts first. */
const STATUS_RANK: Record<TaskStatus, number> = {
  in_progress: 0,
  pending: 1,
  blocked: 2,
  completed: 3,
};

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function newestFirst(a: Task, b: Task): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

/** Every ordering falls back to most-recently-updated so ties are stable. */
function compare(sort: TaskSort) {
  return (a: FilterableTask, b: FilterableTask): number => {
    switch (sort) {
      case "created":
        return b.createdAt.localeCompare(a.createdAt) || newestFirst(a, b);
      case "priority":
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || newestFirst(a, b);
      case "status":
        return STATUS_RANK[a.status] - STATUS_RANK[b.status] || newestFirst(a, b);
      case "updated":
        return newestFirst(a, b);
    }
  };
}

/**
 * Filters and sorts in one pass over an already-joined list.
 *
 * This is the only place task filtering is implemented: the global task list
 * and a project's task list both call it.
 */
export function applyTaskQuery<T extends FilterableTask>(
  tasks: T[],
  query: TaskQuery,
): T[] {
  const term = query.q.trim().toLowerCase();

  const filtered = tasks.filter((task) => {
    if (query.projectId && task.projectId !== query.projectId) return false;

    if (query.assigneeId === UNASSIGNED) {
      if (task.assigneeId) return false;
    } else if (query.assigneeId && task.assigneeId !== query.assigneeId) {
      return false;
    }

    if (query.status && task.status !== query.status) return false;
    if (query.priority && task.priority !== query.priority) return false;
    if (!matchesDue(task, query.due)) return false;
    // A whitespace-only search is treated as no search at all.
    if (term && !matchesSearch(task, term)) return false;
    return true;
  });

  return filtered.sort(compare(query.sort));
}
