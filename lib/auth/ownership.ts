import "server-only";

import { users } from "@/lib/storage/users";

/**
 * Who may add accounts.
 *
 * The **first account created** owns the instance. That is deliberate: it needs
 * no configuration, works on a fresh deployment immediately, and cannot be
 * mistyped into locking everyone out the way an environment variable could.
 *
 * This is not a role system. There is exactly one capability — creating other
 * accounts — and no other behaviour differs between the owner and anyone else.
 * Specification section 17 excludes roles and permissions, and this stays
 * inside that boundary.
 */
export async function getOwnerId(): Promise<string | null> {
  // list() returns rows oldest first, so the first row is the first account.
  const all = await users.list();
  return all[0]?.id ?? null;
}

export async function isOwner(userId: string): Promise<boolean> {
  return (await getOwnerId()) === userId;
}
