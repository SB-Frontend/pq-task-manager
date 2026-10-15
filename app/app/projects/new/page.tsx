import { notFound } from "next/navigation";

import ProjectForm from "@/components/projects/ProjectForm";
import PageHeader from "@/components/ui/PageHeader";
import { canManageProjects, requireViewer } from "@/lib/auth/scope";
import { createProjectAction } from "@/lib/projects/actions";

export const metadata = { title: "New project" };

export default async function NewProjectPage() {
  const viewer = await requireViewer();
  // Owner-only, reported as missing rather than forbidden.
  if (!canManageProjects(viewer)) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="New project" description="Add a project to track work against." />

      <div className="rounded-lg border border-border bg-card p-5">
        <ProjectForm
          action={createProjectAction}
          submitLabel="Create Project"
          cancelHref="/app/projects"
        />
      </div>
    </div>
  );
}
