import { notFound } from "next/navigation";

import ArchiveProjectButton from "@/components/projects/ArchiveProjectButton";
import TaskFilters from "@/components/tasks/TaskFilters";
import TaskList from "@/components/tasks/TaskList";
import { buttonClassName } from "@/components/ui/Button";
import ButtonLink from "@/components/ui/ButtonLink";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import ProgressBar from "@/components/ui/ProgressBar";
import StatusBadge from "@/components/ui/StatusBadge";
import { requireUser } from "@/lib/auth/auth";
import { formatDate, formatDuration } from "@/lib/format";
import { getProject } from "@/lib/projects/queries";
import { hasActiveFilters, parseTaskQuery } from "@/lib/tasks/filters";
import { listTasksForProject } from "@/lib/tasks/queries";

/** Specification section 9: filter by status, plus sorting. */
const PROJECT_TASK_FIELDS = ["status", "sort"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const project = await getProject((await params).id);
  return { title: project?.name ?? "Project not found" };
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();

  // Covers both a malformed id and a project that does not exist.
  const project = await getProject((await params).id);
  if (!project) notFound();

  // Specification section 9: status filter and sort only - no search here.
  const query = parseTaskQuery(await searchParams);
  const { tasks: projectTasks, totalCount: taskTotal } = await listTasksForProject(
    project.id,
    query,
  );
  const filtersActive = hasActiveFilters(query);

  const isArchived = project.status === "archived";

  const details = [
    { label: "Client", value: project.client },
    { label: "Start date", value: formatDate(project.startDate) },
    { label: "Target date", value: formatDate(project.targetDate) },
    {
      label: "Tasks",
      value: `${project.completedTaskCount} of ${project.taskCount} complete`,
    },
    { label: "Logged", value: formatDuration(project.loggedMinutes) },
  ].filter((detail) => detail.value);

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={project.client}
        actions={
          <>
            {/* Specification section 15: export this project's tasks. Reuses the
                existing endpoint; a plain anchor so the router cannot intercept
                the download. Hidden when there is nothing to export. */}
            {taskTotal > 0 && (
              <a
                href={`/api/tasks/export?project=${project.id}`}
                className={buttonClassName({ variant: "secondary" })}
              >
                Export Excel
              </a>
            )}

            <ButtonLink href={`/app/projects/${project.id}/edit`} variant="secondary">
              Edit
            </ButtonLink>
            {!isArchived && (
              <ArchiveProjectButton projectId={project.id} projectName={project.name} />
            )}
          </>
        }
      />

      <section className="space-y-4 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={project.status} />
          {isArchived && (
            <p className="text-xs text-muted">
              Archived projects are hidden from the project list. Set the status back to
              Active from Edit to restore it.
            </p>
          )}
        </div>

        {project.description && (
          <p className="whitespace-pre-line text-sm text-muted">{project.description}</p>
        )}

        {details.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {details.map((detail) => (
              <div key={detail.label}>
                <dt className="text-xs text-muted">{detail.label}</dt>
                <dd className="mt-0.5 break-words text-sm">{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <ProgressBar value={project.progress} label="Project progress" showValue />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Tasks</h2>

          <ButtonLink
            href={`/app/tasks/new?projectId=${project.id}`}
            variant="secondary"
            size="sm"
          >
            Add Task
          </ButtonLink>
        </div>

        {taskTotal > 0 && (
          <TaskFilters
            fields={PROJECT_TASK_FIELDS}
            resultCount={projectTasks.length}
            totalCount={taskTotal}
            active={filtersActive}
          />
        )}

        {taskTotal === 0 ? (
          <EmptyState
            title="No tasks yet"
            description="Add the first task to start tracking work on this project."
            action={
              <ButtonLink href={`/app/tasks/new?projectId=${project.id}`}>
                Add Task
              </ButtonLink>
            }
          />
        ) : (
          /* Every task here belongs to this project, so the column is redundant. */
          <TaskList tasks={projectTasks} showProject={false} />
        )}

        {taskTotal > 0 && projectTasks.length === 0 && (
          <EmptyState
            title="No matching tasks"
            description="No task in this project matches the current filters."
            action={
              <ButtonLink href={`/app/projects/${project.id}`} variant="secondary">
                Clear filters
              </ButtonLink>
            }
          />
        )}
      </section>
    </div>
  );
}
