import TaskFilters from "@/components/tasks/TaskFilters";
import TaskList from "@/components/tasks/TaskList";
import ButtonLink from "@/components/ui/ButtonLink";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { requireUser } from "@/lib/auth/auth";
import { hasActiveFilters, parseTaskQuery } from "@/lib/tasks/filters";
import { listTasks } from "@/lib/tasks/queries";
import { listAssignableUsers } from "@/lib/users/queries";

export const metadata = { title: "Tasks" };

const FIELDS = [
  "search",
  "project",
  "assignee",
  "status",
  "priority",
  "due",
  "sort",
] as const;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();

  const query = parseTaskQuery(await searchParams);
  const [{ tasks, totalCount, projectOptions }, assigneeOptions] = await Promise.all([
    listTasks(query),
    listAssignableUsers(),
  ]);
  const active = hasActiveFilters(query);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Track your project work and progress."
        actions={<ButtonLink href="/app/tasks/new">New Task</ButtonLink>}
      />

      {/* With no tasks at all there is nothing to filter, so the bar is hidden. */}
      {totalCount === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Add your first task to start tracking what you are working on."
          action={<ButtonLink href="/app/tasks/new">Add Task</ButtonLink>}
        />
      ) : (
        <>
          <TaskFilters
            fields={FIELDS}
            projectOptions={projectOptions}
            assigneeOptions={assigneeOptions}
            resultCount={tasks.length}
            totalCount={totalCount}
            active={active}
            showExport
          />

          {tasks.length === 0 ? (
            <EmptyState
              title="No matching tasks"
              description="No task matches the current search and filters."
              action={
                <ButtonLink href="/app/tasks" variant="secondary">
                  Clear filters
                </ButtonLink>
              }
            />
          ) : (
            <TaskList tasks={tasks} />
          )}
        </>
      )}
    </div>
  );
}
