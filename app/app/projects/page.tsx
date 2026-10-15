import Link from "next/link";

import ProjectCard from "@/components/projects/ProjectCard";
import ButtonLink from "@/components/ui/ButtonLink";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { canManageProjects, requireViewer } from "@/lib/auth/scope";
import { countArchivedProjects, listProjects } from "@/lib/projects/queries";

export const metadata = { title: "Projects" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const viewer = await requireViewer();
  const canManage = canManageProjects(viewer);

  const showArchived = (await searchParams).status === "archived";
  const [projects, archivedCount] = await Promise.all([
    listProjects({ archived: showArchived }),
    countArchivedProjects(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={
          canManage
            ? "Manage your projects and track progress."
            : "Projects you have been assigned work in."
        }
        actions={
          canManage ? <ButtonLink href="/app/projects/new">New Project</ButtonLink> : null
        }
      />

      {/* Archived projects stay reachable without cluttering the default list. */}
      {(archivedCount > 0 || showArchived) && (
        <nav aria-label="Project filter" className="flex gap-1 text-sm">
          {[
            { label: "Active", href: "/app/projects", current: !showArchived },
            {
              label: `Archived (${archivedCount})`,
              href: "/app/projects?status=archived",
              current: showArchived,
            },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.current ? "page" : undefined}
              className={`rounded-md px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 ${
                tab.current
                  ? "bg-foreground/8 font-medium"
                  : "text-muted hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      )}

      {projects.length === 0 ? (
        showArchived ? (
          <EmptyState
            title="No archived projects"
            description="Projects you archive will appear here."
          />
        ) : canManage ? (
          <EmptyState
            title="No projects yet"
            description="Create your first project to start tracking your work."
            action={<ButtonLink href="/app/projects/new">Create Project</ButtonLink>}
          />
        ) : (
          /* A member's project list is a by-product of their assignments, so
             "none" means "nothing assigned to me", not "nothing exists". */
          <EmptyState
            title="No projects assigned to you"
            description="A project appears here once you have a task assigned to you in it."
          />
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </ul>
      )}
    </div>
  );
}
