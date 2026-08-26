import Link from "next/link";

import DeleteWorkLogButton from "@/components/work-logs/DeleteWorkLogButton";
import { formatDate, formatDuration } from "@/lib/format";
import type { Project, Task, WorkLog } from "@/types";

export type WorkLogListItem = WorkLog & {
  task?: Pick<Task, "id" | "title"> | null;
  project?: Pick<Project, "id" | "name"> | null;
};

interface WorkLogListProps {
  workLogs: WorkLogListItem[];
  /** Hidden on a task page, where every entry belongs to the same task. */
  showTask?: boolean;
}

/**
 * A stacked list rather than a table: an entry is a date, a duration and a
 * sentence, which reads well at every width without a separate mobile layout.
 */
export default function WorkLogList({ workLogs, showTask = true }: WorkLogListProps) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {workLogs.map((log) => (
        <li key={log.id} className="min-w-0 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-sm font-medium">{formatDate(log.date)}</span>
              <span className="text-sm text-muted">{formatDuration(log.minutes)}</span>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Link
                href={`/app/work-logs/${log.id}/edit`}
                className="rounded text-xs text-muted transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
              >
                Edit
              </Link>

              <DeleteWorkLogButton
                workLogId={log.id}
                label={`${formatDate(log.date)} (${formatDuration(log.minutes)})`}
              />
            </div>
          </div>

          {showTask && (
            <p className="mt-1 min-w-0 truncate text-xs text-muted">
              {log.task ? (
                <Link
                  href={`/app/tasks/${log.task.id}`}
                  className="rounded underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
                >
                  {log.task.title}
                </Link>
              ) : (
                "Task unavailable"
              )}
              {log.project && ` - ${log.project.name}`}
            </p>
          )}

          <p className="mt-2 whitespace-pre-line break-words text-sm text-muted">
            {log.description}
          </p>
        </li>
      ))}
    </ul>
  );
}
