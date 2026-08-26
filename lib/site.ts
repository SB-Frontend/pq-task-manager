/**
 * Single source of truth for application-level naming.
 * Used by document metadata and the application shell so the name
 * is never duplicated across components.
 */
export const site = {
  name: "Project Task Manager",
  description:
    "A small, fast personal tracker for projects, tasks, and work logs.",
} as const;
