import { notFound } from "next/navigation";

import TaskForm from "@/components/tasks/TaskForm";
import PageHeader from "@/components/ui/PageHeader";
import { requireUser } from "@/lib/auth/auth";
import { updateTaskAction } from "@/lib/tasks/actions";
import { getTask, listSelectableProjects } from "@/lib/tasks/queries";
import { listAssignableUsers } from "@/lib/users/queries";

export const metadata = { title: "Edit task" };

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();

  const { id } = await params;
  const task = await getTask(id);
  if (!task) notFound();

  const [projects, assignees] = await Promise.all([
    listSelectableProjects(task.projectId),
    listAssignableUsers(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Edit task" description={task.title} />

      <div className="rounded-lg border border-border bg-card p-5">
        <TaskForm
          // The id is bound here so the shared form stays unaware of it.
          action={updateTaskAction.bind(null, id)}
          projects={projects}
          assignees={assignees}
          task={task}
          submitLabel="Save changes"
          cancelHref={`/app/tasks/${id}`}
        />
      </div>
    </div>
  );
}
