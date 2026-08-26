"use client";

import { useActionState } from "react";

import Button from "@/components/ui/Button";
import ButtonLink from "@/components/ui/ButtonLink";
import DateInput from "@/components/ui/DateInput";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import type { WorkLogFormState } from "@/lib/work-logs/actions";
import type { WorkLog } from "@/types";

/** Stored minutes shown back to the user as hours. */
function toHours(minutes?: number): string | undefined {
  if (minutes === undefined) return undefined;
  return String(Math.round((minutes / 60) * 100) / 100);
}

interface WorkLogFormProps {
  /** Create or update: both share this component, neither duplicates it. */
  action: (state: WorkLogFormState, formData: FormData) => Promise<WorkLogFormState>;
  tasks: { id: string; title: string; projectName: string }[];
  workLog?: WorkLog;
  /** Preselects the task when logging from a task page. */
  defaultTaskId?: string;
  /** Today, so a new entry does not start empty. */
  defaultDate: string;
  submitLabel: string;
  cancelHref: string;
}

const initialState: WorkLogFormState = {};

export default function WorkLogForm({
  action,
  tasks,
  workLog,
  defaultTaskId,
  defaultDate,
  submitLabel,
  cancelHref,
}: WorkLogFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.message && (
        <p
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400"
        >
          {state.message}
        </p>
      )}

      <Select
        label="Task"
        name="taskId"
        required
        options={tasks.map((task) => ({
          value: task.id,
          label: task.projectName ? `${task.title} - ${task.projectName}` : task.title,
        }))}
        placeholder="Select a task"
        defaultValue={workLog?.taskId ?? defaultTaskId ?? ""}
        error={state.fieldErrors?.taskId?.[0]}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <DateInput
          label="Date"
          name="date"
          required
          defaultValue={workLog?.date ?? defaultDate}
          error={state.fieldErrors?.date?.[0]}
        />

        <Input
          label="Duration (hours)"
          name="hours"
          type="number"
          required
          min={0}
          step={0.25}
          inputMode="decimal"
          description="For example 1.5 for 1h 30m."
          defaultValue={toHours(workLog?.minutes)}
          error={state.fieldErrors?.minutes?.[0]}
        />
      </div>

      <Textarea
        label="Description"
        name="description"
        required
        maxLength={2000}
        description="What did you actually do in this session?"
        defaultValue={workLog?.description}
        error={state.fieldErrors?.description?.[0]}
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <ButtonLink href={cancelHref} variant="secondary">
          Cancel
        </ButtonLink>

        <Button type="submit" loading={pending}>
          {pending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
