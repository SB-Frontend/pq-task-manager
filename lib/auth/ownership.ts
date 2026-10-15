import "server-only";

import { getOldestUserId } from "@/lib/storage/users";

/**
 * Who may add accounts.
 *
 * The **first account created** owns the instance. That is deliberate: it needs
 * no configuration, works on a fresh deployment immediately, and cannot be
 * mistyped into locking everyone out the way an environment variable could.
 *
 * This is not a role system. There are exactly two states — owner and member —
 * derived from one fact, with no role column and no permission table. What each
 * may see and change is defined in one place, lib/auth/scope.ts.
 */
export async function getOwnerId(): Promise<string | null> {
  // The oldest account is the first account. Resolved as a one-row query.
  return getOldestUserId();
}

export async function isOwner(userId: string): Promise<boolean> {
  return (await getOwnerId()) === userId;
}
