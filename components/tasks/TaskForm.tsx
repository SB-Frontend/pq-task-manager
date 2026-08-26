"use client";

import { useActionState } from "react";

import Button from "@/components/ui/Button";
import ButtonLink from "@/components/ui/ButtonLink";
import DateInput from "@/components/ui/DateInput";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import type { TaskFormState } from "@/lib/tasks/actions";
import type { Project, PublicUser, Task } from "@/types";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "blocked", label: "Blocked" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

/** Stored minutes shown back to the user as hours. */
function toHours(minutes?: number): string | undefined {
  if (minutes === undefined) return undefined;
  return String(Math.round((minutes / 60) * 100) / 100);
}

interface TaskFormProps {
  /** Create or update: both share this component, neither duplicates it. */
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  projects: Pick<Project, "id" | "name" | "status">[];
  /** Everyone a task can be assigned to. Assignment grants no access. */
  assignees: Pick<PublicUser, "id" | "name">[];
  task?: Task;
  /** Preselects the project when adding a task from a project page. */
  defaultProjectId?: string;
  submitLabel: string;
  cancelHref: string;
}

const initialState: TaskFormState = {};

export default function TaskForm({
  action,
  projects,
  assignees,
  task,
  defaultProjectId,
  submitLabel,
  cancelHref,
}: TaskFormProps) {
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

      <Input
        label="Task title"
        name="title"
        required
        maxLength={200}
        defaultValue={task?.title}
        error={state.fieldErrors?.title?.[0]}
      />

      <Select
        label="Project"
        name="projectId"
        required
        options={projects.map((project) => ({
          value: project.id,
          label:
            project.status === "archived"
              ? `${project.name} (archived)`
              : project.name,
        }))}
        placeholder="Select a project"
        defaultValue={task?.projectId ?? defaultProjectId ?? ""}
        error={state.fieldErrors?.projectId?.[0]}
      />

      <Select
        label="Assignee"
        name="assigneeId"
        options={assignees.map((user) => ({ value: user.id, label: user.name }))}
        placeholder="Unassigned"
        defaultValue={task?.assigneeId ?? ""}
        error={state.fieldErrors?.assigneeId?.[0]}
      />

      <Textarea
        label="Description"
        name="description"
        maxLength={2000}
        defaultValue={task?.description}
        error={state.fieldErrors?.description?.[0]}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={task?.status ?? "pending"}
          error={state.fieldErrors?.status?.[0]}
        />

        <Select
          label="Priority"
          name="priority"
          options={PRIORITY_OPTIONS}
          defaultValue={task?.priority ?? "medium"}
          error={state.fieldErrors?.priority?.[0]}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Estimated hours"
          name="estimatedHours"
          type="number"
          min={0}
          step={0.25}
          inputMode="decimal"
          defaultValue={toHours(task?.estimatedMinutes)}
          error={state.fieldErrors?.estimatedMinutes?.[0]}
        />

        <Input
          label="Actual hours"
          name="actualHours"
          type="number"
          min={0}
          step={0.25}
          inputMode="decimal"
          defaultValue={toHours(task?.actualMinutes)}
          error={state.fieldErrors?.actualMinutes?.[0]}
        />
      </div>

      <Input
        label="Tags"
        name="tags"
        description="Comma separated, e.g. api, ui"
        defaultValue={task?.tags.join(", ")}
        error={state.fieldErrors?.tags?.[0]}
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <DateInput
          label="Due date"
          name="dueDate"
          defaultValue={task?.dueDate}
          error={state.fieldErrors?.dueDate?.[0]}
        />

        <DateInput
          label="Start date"
          name="startedAt"
          defaultValue={task?.startedAt}
          error={state.fieldErrors?.startedAt?.[0]}
        />

        <DateInput
          label="Completion date"
          name="completedAt"
          defaultValue={task?.completedAt}
          error={state.fieldErrors?.completedAt?.[0]}
        />
      </div>

      <Textarea
        label="Developer notes"
        name="notes"
        maxLength={2000}
        description="What you changed, decisions made, things to remember."
        defaultValue={task?.notes}
        error={state.fieldErrors?.notes?.[0]}
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
