"use client";

import { useActionState } from "react";

import Button from "@/components/ui/Button";
import ButtonLink from "@/components/ui/ButtonLink";
import DateInput from "@/components/ui/DateInput";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import type { ProjectFormState } from "@/lib/projects/actions";
import type { Project } from "@/types";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

interface ProjectFormProps {
  /** Create or update: both share this component, neither duplicates it. */
  action: (state: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  project?: Project;
  submitLabel: string;
  cancelHref: string;
}

const initialState: ProjectFormState = {};

export default function ProjectForm({
  action,
  project,
  submitLabel,
  cancelHref,
}: ProjectFormProps) {
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
        label="Project name"
        name="name"
        required
        maxLength={120}
        defaultValue={project?.name}
        error={state.fieldErrors?.name?.[0]}
      />

      <Input
        label="Client / company"
        name="client"
        maxLength={120}
        defaultValue={project?.client}
        error={state.fieldErrors?.client?.[0]}
      />

      <Textarea
        label="Description"
        name="description"
        maxLength={2000}
        defaultValue={project?.description}
        error={state.fieldErrors?.description?.[0]}
      />

      <Select
        label="Status"
        name="status"
        options={STATUS_OPTIONS}
        defaultValue={project?.status ?? "active"}
        error={state.fieldErrors?.status?.[0]}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <DateInput
          label="Start date"
          name="startDate"
          defaultValue={project?.startDate}
          error={state.fieldErrors?.startDate?.[0]}
        />

        <DateInput
          label="Target date"
          name="targetDate"
          defaultValue={project?.targetDate}
          error={state.fieldErrors?.targetDate?.[0]}
        />
      </div>

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
