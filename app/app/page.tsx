import ActiveProjects from "@/components/dashboard/ActiveProjects";
import RecentActivity from "@/components/dashboard/RecentActivity";
import RecentTasks from "@/components/dashboard/RecentTasks";
import StatCard from "@/components/dashboard/StatCard";
import ButtonLink from "@/components/ui/ButtonLink";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import ProgressBar from "@/components/ui/ProgressBar";
import StatusBadge from "@/components/ui/StatusBadge";
import { requireUser } from "@/lib/auth/auth";
import { getDashboardData } from "@/lib/dashboard/queries";
import { formatDuration } from "@/lib/format";
import type { TaskStatus } from "@/types";

export const metadata = { title: "Dashboard" };

const TASK_SUMMARY: { status: TaskStatus; key: TaskStatus }[] = [
  { status: "pending", key: "pending" },
  { status: "in_progress", key: "in_progress" },
  { status: "completed", key: "completed" },
  { status: "blocked", key: "blocked" },
];

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // min-w-0: this section is a grid item in the two-column row below, and a
    // grid item defaults to min-width:auto. Without this the track is sized to
    // the content's min-content width and the whole page scrolls sideways on a
    // narrow screen.
    <section className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData();

  // Nothing exists yet: a wall of zeros would say less than one sentence.
  if (data.isEmpty) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome, ${user.name}`}
          description="Your project and task overview will appear here."
        />

        <EmptyState
          title="No projects yet"
          description="Create your first project to start tracking work."
          action={<ButtonLink href="/app/projects/new">Create Project</ButtonLink>}
        />
      </div>
    );
  }

  const logged = formatDuration(data.loggedMinutes);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="An overview of your projects, tasks and logged work."
      />

      <section aria-labelledby="projects-overview" className="space-y-3">
        <h2 id="projects-overview" className="text-sm font-semibold">
          Projects
        </h2>

        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total projects" value={data.projectCounts.total} />
          <StatCard label="Active" value={data.projectCounts.active} />
          <StatCard label="Completed" value={data.projectCounts.completed} />
          <StatCard label="Archived" value={data.projectCounts.archived} />
        </dl>
      </section>

      <section aria-labelledby="tasks-overview" className="space-y-3">
        <h2 id="tasks-overview" className="text-sm font-semibold">
          Tasks and time
        </h2>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total tasks" value={data.taskCounts.total} />
          <StatCard label="Pending" value={data.taskCounts.pending} />
          <StatCard label="In progress" value={data.taskCounts.in_progress} />
          <StatCard label="Completed" value={data.taskCounts.completed} />
          <StatCard
            label="Time logged"
            value={logged ?? "None yet"}
            hint={
              data.workLogCount === 1
                ? "1 work log"
                : `${data.workLogCount} work logs`
            }
          />
        </dl>
      </section>

      <Section title="Task summary">
        {data.taskCounts.total === 0 ? (
          <EmptyState
            title="No tasks yet"
            description="Add a task to a project to start tracking your work."
            action={<ButtonLink href="/app/tasks/new">Add Task</ButtonLink>}
          />
        ) : (
          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TASK_SUMMARY.map(({ status, key }) => (
                <li key={key} className="min-w-0 space-y-1.5">
                  <StatusBadge status={status} />
                  <p className="text-lg font-semibold tabular-nums">
                    {data.taskCounts[key]}
                  </p>
                </li>
              ))}
            </ul>

            <div className="border-t border-border pt-4">
              <ProgressBar
                value={data.overallProgress}
                label="Overall task completion"
                showValue
              />
            </div>
          </div>
        )}
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section
          title="Active projects"
          action={
            <ButtonLink href="/app/projects" variant="ghost" size="sm">
              View all
            </ButtonLink>
          }
        >
          {data.activeProjects.length === 0 ? (
            <EmptyState
              title="No active projects"
              description="Projects you are currently working on will appear here."
            />
          ) : (
            <ActiveProjects projects={data.activeProjects} />
          )}
        </Section>

        <Section
          title="Recent tasks"
          action={
            <ButtonLink href="/app/tasks" variant="ghost" size="sm">
              View all
            </ButtonLink>
          }
        >
          {data.recentTasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              description="Recently updated tasks will appear here."
            />
          ) : (
            <RecentTasks tasks={data.recentTasks} />
          )}
        </Section>
      </div>

      <Section title="Recent activity">
        {data.recentActivity.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Creating and updating projects, tasks and work logs will show up here."
          />
        ) : (
          <RecentActivity activities={data.recentActivity} />
        )}
      </Section>
    </div>
  );
}
