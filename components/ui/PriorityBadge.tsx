import type { TaskPriority } from "@/types";

/** A dot carries the priority; the text stays neutral so lists remain calm. */
const PRIORITIES: Record<TaskPriority, { label: string; dot: string }> = {
  low: { label: "Low", dot: "bg-slate-400" },
  medium: { label: "Medium", dot: "bg-amber-500" },
  high: { label: "High", dot: "bg-red-500" },
};

export default function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { label, dot } = PRIORITIES[priority];

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
