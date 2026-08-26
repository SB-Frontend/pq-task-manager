import TaskForm from "@/components/tasks/TaskForm";
import ButtonLink from "@/components/ui/ButtonLink";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { requireUser } from "@/lib/auth/auth";
import { createTaskAction } from "@/lib/tasks/actions";
import { listSelectableProjects } from "@/lib/tasks/queries";
import { listAssignableUsers } from "@/lib/users/queries";

export const metadata = { title: "New task" };

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  await requireUser();

  const [{ projectId }, projects, assignees] = await Promise.all([
    searchParams,
    listSelectableProjects(),
    listAssignableUsers(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="New task" description="Add a task to one of your projects." />

      {/* A task cannot exist without a project, so say so rather than showing
          a form with an empty project list. */}
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Every task belongs to a project. Create a project first."
          action={<ButtonLink href="/app/projects/new">Create Project</ButtonLink>}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card p-5">
          <TaskForm
            action={createTaskAction}
            projects={projects}
            assignees={assignees}
            defaultProjectId={projectId}
            submitLabel="Create Task"
            cancelHref="/app/tasks"
          />
        </div>
      )}
    </div>
  );
}
