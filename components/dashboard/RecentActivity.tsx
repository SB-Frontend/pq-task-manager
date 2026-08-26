import { formatDate } from "@/lib/format";
import type { Activity } from "@/types";

/** The lightweight history: what happened, and when. */
export default function RecentActivity({ activities }: { activities: Activity[] }) {
  return (
    <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {activities.map((activity) => (
        <li
          key={activity.id}
          className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-4"
        >
          <p className="min-w-0 flex-1 break-words text-sm">{activity.message}</p>
          <time
            dateTime={activity.createdAt}
            className="shrink-0 text-xs text-muted tabular-nums"
          >
            {formatDate(activity.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
