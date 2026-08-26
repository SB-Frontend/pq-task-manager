"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { recordActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth/auth";
import { projectSchema } from "@/lib/projects/schemas";
import { projects } from "@/lib/storage/projects";

export interface ProjectFormState {
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * An untouched optional input arrives as "", which must become undefined so the
 * field is absent from storage rather than stored as an empty string.
 */
function readProjectForm(formData: FormData) {
  const optional = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== "" ? value : undefined;
  };

  return {
    name: formData.get("name") ?? "",
    client: optional("client"),
    description: optional("description"),
    status: formData.get("status") ?? "active",
    startDate: optional("startDate"),
    targetDate: optional("targetDate"),
  };
}

export async function createProjectAction(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await requireUser();

  const parsed = projectSchema.safeParse(readProjectForm(formData));

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const now = new Date().toISOString();
  const project = await projects.insert({
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  });

  await recordActivity({
    type: "project_created",
    message: `Created project "${project.name}"`,
    projectId: project.id,
  });

  revalidatePath("/app/projects");
  // redirect() throws, so it must sit outside any try/catch.
  redirect(`/app/projects/${project.id}`);
}

export async function updateProjectAction(
  id: string,
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await requireUser();

  const parsed = projectSchema.safeParse(readProjectForm(formData));

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  // Optional fields that were cleared are spread in as undefined, which removes
  // them from the stored record rather than leaving a stale value behind.
  const updated = await projects.update(id, {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  });

  if (!updated) {
    return { message: "This project no longer exists." };
  }

  await recordActivity({
    type: "project_updated",
    message: `Updated project "${updated.name}"`,
    projectId: updated.id,
  });

  revalidatePath("/app/projects");
  revalidatePath(`/app/projects/${id}`);
  redirect(`/app/projects/${id}`);
}

/**
 * Archiving is the only removal the application offers: the project and every
 * task and work log attached to it stay in storage untouched.
 */
export async function archiveProjectAction(id: string): Promise<void> {
  await requireUser();

  const project = await projects.find(id);
  if (!project) return;

  await projects.update(id, {
    status: "archived",
    updatedAt: new Date().toISOString(),
  });

  await recordActivity({
    type: "project_updated",
    message: `Archived project "${project.name}"`,
    projectId: id,
  });

  revalidatePath("/app/projects");
  revalidatePath(`/app/projects/${id}`);
  redirect("/app/projects");
}
