import "server-only";

import { requireUser } from "@/lib/auth/auth";
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
 * Assignment is collaboration metadata only: it records who is working on
 * something and grants no access of any kind.
 */
export async function listAssignableUsers(): Promise<PublicUser[]> {
  await requireUser();

  const all = await users.list();
  return all.sort((a, b) => a.name.localeCompare(b.name)).map(toPublicUser);
}

/**
 * Every account, for the owner's Settings view.
 *
 * Only ever called behind an owner check; it returns public users, so no
 * password hash can be exposed regardless.
 */
export async function listUsers(): Promise<PublicUser[]> {
  await requireUser();

  const all = await users.list();
  return all
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(toPublicUser);
}
