import ButtonLink from "@/components/ui/ButtonLink";
import ErrorState from "@/components/ui/ErrorState";

export default function TaskNotFound() {
  return (
    <ErrorState
      title="Task not found"
      description="This task does not exist, or it has been deleted."
      action={<ButtonLink href="/app/tasks">Back to tasks</ButtonLink>}
    />
  );
}
