import type { ReactNode } from "react";

import { InboxIcon } from "@/components/ui/icons";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional call to action, e.g. a "Create Project" button. */
  action?: ReactNode;
  icon?: ReactNode;
}

/** Generic on purpose: all wording is supplied by the caller. */
export default function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-14 text-center">
      <span className="mb-3 text-muted">
        {icon ?? <InboxIcon className="size-7" />}
      </span>

      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
