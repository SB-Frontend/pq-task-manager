import "server-only";

import { redirect } from "next/navigation";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSession } from "@/lib/auth/session";
import { users } from "@/lib/storage/users";
import type { PublicUser, User } from "@/types";

/**
 * Built field by field rather than by deleting passwordHash, so a sensitive
 * field added to User later cannot leak by omission.
 */
function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export type AuthResult =
  | { ok: true; user: PublicUser }
  | { ok: false; message: string; field?: "email" };

/** Creates an account and logs the new user straight in. */
export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const existing = await users.findOneWhere((user) => user.email === input.email);

  if (existing) {
    return {
      ok: false,
      message: "An account with this email already exists.",
      field: "email",
    };
  }

  const now = new Date().toISOString();
  const user = await users.insert({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  });

  await createSession(user.id);

  return { ok: true, user: toPublicUser(user) };
}

/**
 * Verifies credentials and starts a session. The same message is returned for
 * an unknown email and a wrong password, so the response cannot be used to
 * discover which emails are registered.
 */
export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const failure: AuthResult = { ok: false, message: "Invalid email or password." };

  const user = await users.findOneWhere((candidate) => candidate.email === input.email);
  if (!user) return failure;

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) return failure;

  await createSession(user.id);

  return { ok: true, user: toPublicUser(user) };
}

/** Invalidates the session server-side, then clears the cookie. */
export async function logoutUser(): Promise<void> {
  await destroySession();
}

/** The signed-in user, or null. Never includes passwordHash. */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await users.find(session.userId);

  // The session outlived its user: treat it as invalid.
  if (!user) return null;

  return toPublicUser(user);
}

/** The signed-in user, or a redirect to /login. Use this to protect a route. */
export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
