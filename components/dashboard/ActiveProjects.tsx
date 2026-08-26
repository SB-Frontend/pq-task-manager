import Link from "next/link";

import ProgressBar from "@/components/ui/ProgressBar";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import type { ProjectSummary } from "@/lib/dashboard/queries";

export default function ActiveProjects({ projects }: { projects: ProjectSummary[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {projects.map((project) => {
        const target = formatDate(project.targetDate);

        return (
          <li key={project.id} className="min-w-0">
            <Link
              href={`/app/projects/${project.id}`}
              className="block p-4 transition-colors hover:bg-foreground/3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/30"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium">{project.name}</p>
                <StatusBadge status={project.status} />
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted">
                <span>
                  {project.completedTaskCount} of {project.taskCount}{" "}
                  {project.taskCount === 1 ? "task" : "tasks"} complete
                </span>
                {target && <span>Target {target}</span>}
              </div>

              <div className="mt-2">
                <ProgressBar
                  value={project.progress}
                  label={`${project.name} progress`}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
