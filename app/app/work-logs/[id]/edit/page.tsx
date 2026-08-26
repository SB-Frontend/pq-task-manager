import { notFound } from "next/navigation";

import PageHeader from "@/components/ui/PageHeader";
import WorkLogForm from "@/components/work-logs/WorkLogForm";
import { requireUser } from "@/lib/auth/auth";
import { today } from "@/lib/format";
import { updateWorkLogAction } from "@/lib/work-logs/actions";
import { getWorkLog, listSelectableTasks } from "@/lib/work-logs/queries";

export const metadata = { title: "Edit work log" };

export default async function EditWorkLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();

  const { id } = await params;

  // Covers both a malformed id and a work log that does not exist.
  const workLog = await getWorkLog(id);
  if (!workLog) notFound();

  const tasks = await listSelectableTasks();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Edit work log" description="Correct a recorded work session." />

      <div className="rounded-lg border border-border bg-card p-5">
        <WorkLogForm
          // The id is bound here so the shared form stays unaware of it.
          action={updateWorkLogAction.bind(null, id)}
          tasks={tasks}
          workLog={workLog}
          defaultDate={today()}
          submitLabel="Save changes"
          cancelHref={`/app/tasks/${workLog.taskId}`}
        />
      </div>
    </div>
  );
}
