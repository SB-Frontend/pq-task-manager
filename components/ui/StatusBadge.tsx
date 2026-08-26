import type { ProjectStatus, TaskStatus } from "@/types";

type Status = TaskStatus | ProjectStatus;

/** Label and tone per status. Muted on purpose - badges should not shout. */
const STATUSES: Record<Status, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  in_progress: {
    label: "In Progress",
    className: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  },
  completed: {
    label: "Completed",
    className: "border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300",
  },
  blocked: {
    label: "Blocked",
    className: "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  },
  active: {
    label: "Active",
    className: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  },
  archived: {
    label: "Archived",
    className: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
  },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { label, className } = STATUSES[status];

  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
