import { notFound } from "next/navigation";

import ProjectForm from "@/components/projects/ProjectForm";
import PageHeader from "@/components/ui/PageHeader";
import { requireUser } from "@/lib/auth/auth";
import { updateProjectAction } from "@/lib/projects/actions";
import { getProject } from "@/lib/projects/queries";

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();

  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Edit project" description={project.name} />

      <div className="rounded-lg border border-border bg-card p-5">
        <ProjectForm
          // The id is bound here so the shared form stays unaware of it.
          action={updateProjectAction.bind(null, id)}
          project={project}
          submitLabel="Save changes"
          cancelHref={`/app/projects/${id}`}
        />
      </div>
    </div>
  );
}
