import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import {
  deleteExpiredSessions as deleteExpiredSessionRows,
  sessions,
} from "@/lib/storage/sessions";
import type { Session } from "@/types";

const COOKIE_NAME = "session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** 256 bits from the CSPRNG. Not derived from the user, the time, or a counter. */
function createSessionId(): string {
  return randomBytes(32).toString("base64url");
}

async function readSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

function isExpired(session: Session): boolean {
  return new Date(session.expiresAt).getTime() <= Date.now();
}

/**
 * Issues a brand new session and cookie. Any session the caller already had is
 * destroyed first, so a pre-login identifier can never become the authenticated
 * one (session fixation).
 *
 * Only callable from a Server Action or Route Handler, because it sets a cookie.
 */
export async function createSession(userId: string): Promise<Session> {
  await destroySession();
  await deleteExpiredSessions();

  const now = new Date();
  const session = await sessions.insert(
    {
      userId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    },
    createSessionId(),
  );

  const store = await cookies();
  store.set(COOKIE_NAME, session.id, {
    httpOnly: true, // unreadable from document.cookie
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS / 1000,
  });

  return session;
}

/** Deletes the current session server-side and clears the cookie. */
export async function destroySession(): Promise<void> {
  const sessionId = await readSessionId();

  if (sessionId) {
    await sessions.remove(sessionId);
  }

  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * The caller's session, or null when there is none, it is unknown, or it has
 * expired. An expired session is removed from storage as it is encountered.
 */
export async function getSession(): Promise<Session | null> {
  const sessionId = await readSessionId();
  if (!sessionId) return null;

  const session = await sessions.find(sessionId);
  if (!session) return null;

  if (isExpired(session)) {
    await sessions.remove(session.id);
    return null;
  }

  return session;
}

/**
 * Housekeeping: drops sessions that are past their expiry.
 *
 * A comparison rather than an equality match, so the storage layer runs it as
 * a query instead of loading every session.
 */
export async function deleteExpiredSessions(): Promise<number> {
  return deleteExpiredSessionRows();
}
