import { notFound } from "next/navigation";

import TaskForm from "@/components/tasks/TaskForm";
import PageHeader from "@/components/ui/PageHeader";
import { canReassignTasks, requireViewer } from "@/lib/auth/scope";
import { updateTaskAction } from "@/lib/tasks/actions";
import { getTask, listSelectableProjects } from "@/lib/tasks/queries";
import { listAssignableUsers } from "@/lib/users/queries";

export const metadata = { title: "Edit task" };

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireViewer();

  // getTask already refuses a task assigned to somebody else, so reaching the
  // edit form at all means the viewer may edit it.
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
          // The project and assignee are the owner's to set. The action pins
          // both to their stored values for anyone else, so this only keeps the
          // form honest about what it can actually change.
          lockPlacement={!canReassignTasks(viewer)}
          submitLabel="Save changes"
          cancelHref={`/app/tasks/${id}`}
        />
      </div>
    </div>
  );
}
