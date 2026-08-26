import Link from "next/link";
import { notFound } from "next/navigation";

import DeleteTaskButton from "@/components/tasks/DeleteTaskButton";
import ButtonLink from "@/components/ui/ButtonLink";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import PriorityBadge from "@/components/ui/PriorityBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import WorkLogList from "@/components/work-logs/WorkLogList";
import { requireUser } from "@/lib/auth/auth";
import { formatDate, formatDuration } from "@/lib/format";
import { getTask } from "@/lib/tasks/queries";
import { listWorkLogsForTask, totalMinutes } from "@/lib/work-logs/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const task = await getTask((await params).id);
  return { title: task?.title ?? "Task not found" };
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();

  // Covers both a malformed id and a task that does not exist.
  const task = await getTask((await params).id);
  if (!task) notFound();

  // Logged time is derived from the entries, never stored on the task.
  const logs = await listWorkLogsForTask(task.id);
  const logged = formatDuration(totalMinutes(logs));

  const details = [
    { label: "Estimated", value: formatDuration(task.estimatedMinutes) },
    { label: "Actual", value: formatDuration(task.actualMinutes) },
    { label: "Logged", value: logged },
    { label: "Due date", value: formatDate(task.dueDate) },
    { label: "Start date", value: formatDate(task.startedAt) },
    { label: "Completion date", value: formatDate(task.completedAt) },
  ].filter((detail) => detail.value);

  return (
    <div className="space-y-6">
      <PageHeader
        title={task.title}
        actions={
          <>
            <ButtonLink href={`/app/tasks/${task.id}/edit`} variant="secondary">
              Edit
            </ButtonLink>
            <DeleteTaskButton taskId={task.id} taskTitle={task.title} />
          </>
        }
      />

      <section className="space-y-4 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />

          {task.project ? (
            <Link
              href={`/app/projects/${task.project.id}`}
              className="rounded text-sm text-muted underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
            >
              {task.project.name}
            </Link>
          ) : (
            <span className="text-sm text-muted">Project unavailable</span>
          )}

          <span className="text-sm text-muted">
            {task.assignee ? `Assigned to ${task.assignee.name}` : "Unassigned"}
          </span>
        </div>

        {task.description && (
          <p className="whitespace-pre-line text-sm text-muted">{task.description}</p>
        )}

        {details.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {details.map((detail) => (
              <div key={detail.label} className="min-w-0">
                <dt className="text-xs text-muted">{detail.label}</dt>
                <dd className="mt-0.5 break-words text-sm">{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {task.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {task.tags.map((tag) => (
              <li
                key={tag}
                className="rounded border border-border px-1.5 py-0.5 text-xs text-muted"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">
            Work log
            {logged && (
              <span className="ml-2 font-normal text-muted">
                Total logged: {logged}
              </span>
            )}
          </h2>

          <ButtonLink
            href={`/app/work-logs/new?taskId=${task.id}`}
            variant="secondary"
            size="sm"
          >
            Log Work
          </ButtonLink>
        </div>

        {logs.length === 0 ? (
          <EmptyState
            title="No work logged yet"
            description="Record what you did during a session so you can look back on it later."
            action={
              <ButtonLink href={`/app/work-logs/new?taskId=${task.id}`}>
                Log Work
              </ButtonLink>
            }
          />
        ) : (
          /* Every entry here belongs to this task, so the task line is redundant. */
          <WorkLogList workLogs={logs} showTask={false} />
        )}
      </section>

      {task.notes && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Developer notes</h2>
          <p className="whitespace-pre-line rounded-lg border border-border bg-card p-5 text-sm text-muted">
            {task.notes}
          </p>
        </section>
      )}
    </div>
  );
}
