import ProjectForm from "@/components/projects/ProjectForm";
import PageHeader from "@/components/ui/PageHeader";
import { requireUser } from "@/lib/auth/auth";
import { createProjectAction } from "@/lib/projects/actions";

export const metadata = { title: "New project" };

export default async function NewProjectPage() {
  await requireUser();

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
