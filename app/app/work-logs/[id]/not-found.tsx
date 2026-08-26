import ButtonLink from "@/components/ui/ButtonLink";
import ErrorState from "@/components/ui/ErrorState";

export default function WorkLogNotFound() {
  return (
    <ErrorState
      title="Work log not found"
      description="This work log does not exist, or it has been deleted."
      action={<ButtonLink href="/app/work-logs">Back to work logs</ButtonLink>}
    />
  );
}
