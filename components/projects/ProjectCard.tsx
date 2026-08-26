import Link from "next/link";

import ProgressBar from "@/components/ui/ProgressBar";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import type { ProjectWithStats } from "@/lib/projects/queries";

export default function ProjectCard({ project }: { project: ProjectWithStats }) {
  const start = formatDate(project.startDate);
  const target = formatDate(project.targetDate);

  // min-w-0: a grid item defaults to min-width:auto, so the truncated title
  // (white-space: nowrap) would otherwise hold the grid track open and force the
  // whole page to scroll horizontally on narrow screens.
  return (
    <li className="min-w-0 rounded-lg border border-border bg-card transition-colors hover:border-foreground/25">
      <Link
        href={`/app/projects/${project.id}`}
        className="block h-full rounded-lg p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium">{project.name}</h2>
            {project.client && (
              <p className="mt-0.5 truncate text-xs text-muted">{project.client}</p>
            )}
          </div>

          <StatusBadge status={project.status} />
        </div>

        {project.description && (
          <p className="mt-3 line-clamp-2 text-sm text-muted">{project.description}</p>
        )}

        {(start || target) && (
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {start && (
              <div className="flex gap-1">
                <dt>Start:</dt>
                <dd className="text-foreground">{start}</dd>
              </div>
            )}
            {target && (
              <div className="flex gap-1">
                <dt>Target:</dt>
                <dd className="text-foreground">{target}</dd>
              </div>
            )}
          </dl>
        )}

        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              {project.completedTaskCount} of {project.taskCount}{" "}
              {project.taskCount === 1 ? "task" : "tasks"} complete
            </span>
            <span className="font-medium text-foreground">{project.progress}%</span>
          </div>

          <ProgressBar value={project.progress} label={`${project.name} progress`} />
        </div>
      </Link>
    </li>
  );
}
