import ButtonLink from "@/components/ui/ButtonLink";
import ErrorState from "@/components/ui/ErrorState";

export default function ProjectNotFound() {
  return (
    <ErrorState
      title="Project not found"
      description="This project does not exist, or its link is no longer valid."
      action={<ButtonLink href="/app/projects">Back to projects</ButtonLink>}
    />
  );
}
