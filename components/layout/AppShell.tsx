import type { ReactNode } from "react";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import type { PublicUser } from "@/types";

/**
 * Layout for the authenticated application: a fixed sidebar on large screens, a
 * top bar with a drawer below that, and a single content column.
 *
 * Pages render only their own content - none of this markup is repeated.
 */
export default function AppShell({
  user,
  children,
}: {
  user: PublicUser;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border bg-card lg:block">
        <Sidebar user={user} />
      </aside>

      {/* min-w-0 stops long content from widening the flex row and causing
          horizontal page scroll on small screens. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
