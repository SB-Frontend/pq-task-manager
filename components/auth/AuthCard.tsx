import type { ReactNode } from "react";

import { site } from "@/lib/site";

/** Centred card used by the login and register pages. */
export default function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold tracking-tight">{site.name}</p>
        </div>

        <div className="space-y-5 rounded-lg border border-border bg-card p-6">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted">{description}</p>}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
