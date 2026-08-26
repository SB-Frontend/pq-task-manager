import Link from "next/link";

import PriorityBadge from "@/components/ui/PriorityBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import type { TaskSummary } from "@/lib/dashboard/queries";

export default function RecentTasks({ tasks }: { tasks: TaskSummary[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {tasks.map((task) => {
        const due = formatDate(task.dueDate);

        return (
          <li key={task.id} className="min-w-0">
            <Link
              href={`/app/tasks/${task.id}`}
              className="block p-4 transition-colors hover:bg-foreground/3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/30"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {task.title}
                </p>
                <StatusBadge status={task.status} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <PriorityBadge priority={task.priority} />
                {task.projectName && (
                  <span className="min-w-0 truncate">{task.projectName}</span>
                )}
                {due && <span>Due {due}</span>}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
