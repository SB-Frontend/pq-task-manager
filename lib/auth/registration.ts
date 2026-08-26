import "server-only";

import { users } from "@/lib/storage/users";

/**
 * Whether a new account may be created through public self-registration.
 *
 * Resolution order — an explicit setting always wins:
 *
 *   1. `ALLOW_REGISTRATION=true`  → open. Deliberate, for development or an
 *      emergency where no owner account can sign in.
 *   2. `ALLOW_REGISTRATION=false` → closed, unconditionally. Nothing else is
 *      considered, not even an empty database.
 *   3. Unset → closed, unless **no account exists yet**, so a fresh deployment
 *      can be bootstrapped by its first user.
 *
 * This gates public registration only. The owner's Settings → Accounts flow is
 * governed by `isOwner()` and is deliberately unaffected: an owner can always
 * add accounts, however this is configured.
 *
 * The gate matters because the application has no per-user data scoping — any
 * account can read and edit everything.
 */
export async function isRegistrationOpen(): Promise<boolean> {
  const setting = process.env.ALLOW_REGISTRATION?.trim().toLowerCase();

  if (setting === "true") return true;

  // An explicit "false" is authoritative and disables the bootstrap path too.
  if (setting === "false") return false;

  const existing = await users.list();
  return existing.length === 0;
}

/** Shown wherever registration is refused. Deliberately not specific. */
export const REGISTRATION_CLOSED_MESSAGE =
  "Registration is closed. Ask the owner of this instance for an account.";
