import { SpinnerIcon } from "@/components/ui/icons";

export default function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2.5 px-6 py-14 text-sm text-muted"
    >
      <SpinnerIcon className="size-4" />
      {label}
    </div>
  );
}
