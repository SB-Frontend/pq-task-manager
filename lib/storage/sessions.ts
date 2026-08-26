import "server-only";

import { createCollection } from "@/lib/storage/collection";
import { getSupabase } from "@/lib/storage/supabase";
import type { Session } from "@/types";

/**
 * Server-side sessions. Ids are supplied by the auth layer rather than
 * generated here, because a session id must be unguessable.
 */
export const sessions = createCollection<Session>("sessions", "session");

/**
 * Deletes sessions that have passed their expiry.
 *
 * A comparison rather than an equality match, so it needs its own query rather
 * than the generic filter.
 */
export async function deleteExpiredSessions(): Promise<number> {
  const { data, error } = await getSupabase()
    .from("sessions")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) throw new Error(`Failed to delete expired sessions: ${error.message}`);
  return (data ?? []).length;
}

/**
 * Signs a user out everywhere except the session making the request - used
 * after a password change.
 */
export async function deleteOtherSessions(
  userId: string,
  keepSessionId: string | undefined,
): Promise<number> {
  let query = getSupabase().from("sessions").delete().eq("user_id", userId);

  if (keepSessionId) query = query.neq("id", keepSessionId);

  const { data, error } = await query.select("id");

  if (error) throw new Error(`Failed to revoke other sessions: ${error.message}`);
  return (data ?? []).length;
}
