import "server-only";

import { requireViewer } from "@/lib/auth/scope";
import { users } from "@/lib/storage/users";
import type { PublicUser } from "@/types";

/** Built field by field so a password hash can never reach a caller. */
function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Everyone who can be given a task, by name.
 *
 * **Assignment is now the access grant**, not merely collaboration metadata, so
 * only the owner — the only person who may assign — gets the full roster. A
 * member gets just themselves: enough to label their own tasks and to populate
 * the assignee filter, without learning who else holds an account.
 */
export async function listAssignableUsers(): Promise<PublicUser[]> {
  const viewer = await requireViewer();

  if (!viewer.isOwner) {
    const self = await users.find(viewer.id);
    return self ? [toPublicUser(self)] : [];
  }

  const all = await users.list();
  return all.sort((a, b) => a.name.localeCompare(b.name)).map(toPublicUser);
}

/**
 * Every account, for the owner's Settings view.
 *
 * Enforces ownership itself rather than trusting its caller, and returns public
 * users, so no password hash can be exposed regardless.
 */
export async function listUsers(): Promise<PublicUser[]> {
  const viewer = await requireViewer();
  if (!viewer.isOwner) return [];

  const all = await users.list();
  return all
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(toPublicUser);
}
