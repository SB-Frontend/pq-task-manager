import "server-only";

import { createCollection } from "@/lib/storage/collection";
import { getSupabase } from "@/lib/storage/supabase";
import type { User } from "@/types";

export const users = createCollection<User>("users", "user");

/**
 * The id of the oldest account, which is the instance owner (see
 * lib/auth/ownership.ts).
 *
 * Its own query rather than `users.list()[0]`, because ownership is now
 * resolved on nearly every request to decide what the viewer may see. Reading
 * one column of one row is the difference between a constant cost and a cost
 * that grows with the number of accounts.
 */
export async function getOldestUserId(): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("users")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw new Error(`Failed to resolve the oldest user: ${error.message}`);
  return (data?.[0]?.id as string | undefined) ?? null;
}
