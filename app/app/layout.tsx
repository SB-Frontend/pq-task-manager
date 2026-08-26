import type { ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth/auth";

/**
 * Guards every route under /app. The check runs on the server, so a direct URL
 * visit is redirected before any protected markup is produced.
 *
 * Each protected page also calls requireUser() for its own data, so protection
 * never depends on this layout alone.
 */
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return <AppShell user={user}>{children}</AppShell>;
}
