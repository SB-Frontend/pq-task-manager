import "server-only";

import { users } from "@/lib/storage/users";

/**
 * Whether a new account may be created.
 *
 * Registration is **closed by default**. It opens only when:
 *
 *   1. No account exists yet — so a fresh deployment can be bootstrapped; or
 *   2. ALLOW_REGISTRATION is explicitly set to "true" — used deliberately and
 *      temporarily when another person needs an account.
 *
 * Without this, a publicly reachable deployment lets anyone register, and
 * because the application has no per-user data scoping, a new account can read
 * and edit everything.
 */
export async function isRegistrationOpen(): Promise<boolean> {
  if (process.env.ALLOW_REGISTRATION?.trim().toLowerCase() === "true") {
    return true;
  }

  // Bootstrap: the very first account on an empty deployment.
  const existing = await users.list();
  return existing.length === 0;
}

/** Shown wherever registration is refused. Deliberately not specific. */
export const REGISTRATION_CLOSED_MESSAGE =
  "Registration is closed. Ask the owner of this instance for an account.";
