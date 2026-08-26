import type { ReactNode } from "react";

import { AlertIcon } from "@/components/ui/icons";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export default function ErrorState({
  title = "Something went wrong",
  description = "The page could not be loaded. Please try again.",
  action,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg border border-border px-6 py-14 text-center"
    >
      <AlertIcon className="mb-3 size-7 text-red-600 dark:text-red-400" />

      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
