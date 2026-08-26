import Link from "next/link";

import PriorityBadge from "@/components/ui/PriorityBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, formatDuration } from "@/lib/format";
import type { Project, Task } from "@/types";

export type TaskListItem = Task & {
  project?: Pick<Project, "id" | "name" | "status"> | null;
  assignee?: { id: string; name: string } | null;
};

interface TaskListProps {
  tasks: TaskListItem[];
  /** Hidden on a project page, where every task belongs to the same project. */
  showProject?: boolean;
}

function taskHref(id: string) {
  return `/app/tasks/${id}`;
}

/**
 * A table on wide screens and stacked cards below it.
 *
 * The table is not simply allowed to overflow: below `md` it is replaced
 * entirely, so nothing scrolls sideways on a phone.
 */
export default function TaskList({ tasks, showProject = true }: TaskListProps) {
  return (
    <>
      {/* Small and medium screens */}
      <ul className="space-y-3 lg:hidden">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="min-w-0 rounded-lg border border-border bg-card transition-colors hover:border-foreground/25"
          >
            <Link
              href={taskHref(task.id)}
              className="block rounded-lg p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-sm font-medium">{task.title}</p>
                <StatusBadge status={task.status} />
              </div>

              {showProject && task.project && (
                <p className="mt-1 truncate text-xs text-muted">{task.project.name}</p>
              )}

              <p className="mt-1 truncate text-xs text-muted">
                {task.assignee ? task.assignee.name : "Unassigned"}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <PriorityBadge priority={task.priority} />
                {formatDuration(task.estimatedMinutes) && (
                  <span>Est {formatDuration(task.estimatedMinutes)}</span>
                )}
                {formatDuration(task.actualMinutes) && (
                  <span>Actual {formatDuration(task.actualMinutes)}</span>
                )}
                {formatDate(task.dueDate) && <span>Due {formatDate(task.dueDate)}</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Wide screens only: nine columns need roughly 1024px to stay legible. */}
      <div className="hidden overflow-hidden rounded-lg border border-border lg:block">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-foreground/3 text-left text-xs text-muted">
            <tr>
              <th scope="col" className="w-[22%] px-4 py-2.5 font-medium">
                Task
              </th>
              {showProject && (
                <th scope="col" className="w-[14%] px-4 py-2.5 font-medium">
                  Project
                </th>
              )}
              <th scope="col" className="w-[13%] px-4 py-2.5 font-medium">
                Assignee
              </th>
              <th scope="col" className="w-[11%] px-4 py-2.5 font-medium">
                Status
              </th>
              <th scope="col" className="w-[9%] px-4 py-2.5 font-medium">
                Priority
              </th>
              <th scope="col" className="w-[8%] px-4 py-2.5 font-medium">
                Est
              </th>
              <th scope="col" className="w-[8%] px-4 py-2.5 font-medium">
                Actual
              </th>
              <th scope="col" className="w-[10%] px-4 py-2.5 font-medium">
                Updated
              </th>
              <th scope="col" className="w-[5%] px-4 py-2.5 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-t border-border align-middle">
                <td className="max-w-0 px-4 py-3">
                  <Link
                    href={taskHref(task.id)}
                    className="block truncate font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
                  >
                    {task.title}
                  </Link>
                </td>

                {showProject && (
                  <td className="max-w-0 truncate px-4 py-3 text-muted">
                    {task.project ? task.project.name : "-"}
                  </td>
                )}

                <td className="max-w-0 truncate px-4 py-3 text-muted">
                  {task.assignee ? task.assignee.name : "-"}
                </td>

                <td className="px-4 py-3">
                  <StatusBadge status={task.status} />
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={task.priority} />
                </td>
                <td className="px-4 py-3 text-muted">
                  {formatDuration(task.estimatedMinutes) ?? "-"}
                </td>
                <td className="px-4 py-3 text-muted">
                  {formatDuration(task.actualMinutes) ?? "-"}
                </td>
                <td className="px-4 py-3 text-muted">{formatDate(task.updatedAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`${taskHref(task.id)}/edit`}
                    className="rounded text-muted hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
