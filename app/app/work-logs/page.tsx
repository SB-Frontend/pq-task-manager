import WorkLogList from "@/components/work-logs/WorkLogList";
import ButtonLink from "@/components/ui/ButtonLink";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { requireUser } from "@/lib/auth/auth";
import { formatDuration } from "@/lib/format";
import { listWorkLogs, totalMinutes } from "@/lib/work-logs/queries";

export const metadata = { title: "Work logs" };

export default async function WorkLogsPage() {
  await requireUser();

  const logs = await listWorkLogs();
  const total = formatDuration(totalMinutes(logs));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work logs"
        description={
          total ? `${total} logged across all tasks.` : "What you worked on, session by session."
        }
        actions={<ButtonLink href="/app/work-logs/new">Log Work</ButtonLink>}
      />

      {logs.length === 0 ? (
        <EmptyState
          title="No work logged yet"
          description="Record what you did during a work session so you can look back on it later."
          action={<ButtonLink href="/app/work-logs/new">Log Work</ButtonLink>}
        />
      ) : (
        <WorkLogList workLogs={logs} />
      )}
    </div>
  );
}
