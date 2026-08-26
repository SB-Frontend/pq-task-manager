import ButtonLink from "@/components/ui/ButtonLink";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import WorkLogForm from "@/components/work-logs/WorkLogForm";
import { requireUser } from "@/lib/auth/auth";
import { today } from "@/lib/format";
import { createWorkLogAction } from "@/lib/work-logs/actions";
import { listSelectableTasks } from "@/lib/work-logs/queries";

export const metadata = { title: "Log work" };

export default async function NewWorkLogPage({
  searchParams,
}: {
  searchParams: Promise<{ taskId?: string }>;
}) {
  await requireUser();

  const [{ taskId }, tasks] = await Promise.all([searchParams, listSelectableTasks()]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Log work" description="Record a work session against a task." />

      {/* A work log cannot exist without a task, so say so rather than showing
          a form with an empty task list. */}
      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Every work log belongs to a task. Create a task first."
          action={<ButtonLink href="/app/tasks/new">Create Task</ButtonLink>}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card p-5">
          <WorkLogForm
            action={createWorkLogAction}
            tasks={tasks}
            defaultTaskId={taskId}
            defaultDate={today()}
            submitLabel="Save work log"
            cancelHref={taskId ? `/app/tasks/${taskId}` : "/app/work-logs"}
          />
        </div>
      )}
    </div>
  );
}
